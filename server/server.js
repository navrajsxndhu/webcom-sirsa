const express = require('express');
const multer = require('multer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- Password Hashing Helpers ---
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return hash === testHash;
}

// Security: credentials from environment variables (set on Render dashboard)
const JWT_SECRET = process.env.JWT_SECRET || 'webcom_super_secret_key_2026';
const ADMIN_USER = process.env.ADMIN_USER || 'webcom_admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// Authentication Middleware to protect Admin API routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    if (!token) return res.status(401).json({ error: 'Access Denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

const app = express();

app.use(cors({
    origin: ['http://localhost:5000', 'http://127.0.0.1:5000', /\.vercel\.app$/],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Serve the frontend client files automatically
app.use(express.static(path.join(__dirname, '../client')));
// Serve uploaded files publicly
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Only allow image uploads, max 5MB
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    }
});

app.post('/api/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
            }
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Construct the public URL for the uploaded file
        const fileUrl = '/uploads/' + req.file.filename;

        res.json({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl
        });
    });
});

// --- DATABASE LOGIC ---
const dataFilePath = path.join(__dirname, 'data.json');

const readData = () => {
    try {
        const rawData = fs.readFileSync(dataFilePath);
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading database:", error);
        return { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], inquiries: [] };
    }
};

const writeData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Inquiries are now persisted to data.json so they survive server restarts
app.post('/api/contact', (req, res) => {
    const { name, email, phone, course, message } = req.body;
    
    if(!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required.' });
    }

    const newInquiry = { id: Date.now(), name, email, phone, course, message, date: new Date() };
    
    // Persist to data.json
    const data = readData();
    if (!data.inquiries) data.inquiries = [];
    data.inquiries.push(newInquiry);
    writeData(data);
    
    console.log("New Inquiry Received:", newInquiry);

    // Simulate network delay for realistic loading state
    setTimeout(() => {
        res.status(200).json({ success: true, message: 'Inquiry received successfully!' });
    }, 800);
});

// Protected Route: Fetch Inquiries
app.get('/api/inquiries', authenticateToken, (req, res) => {
    const data = readData();
    const inquiries = data.inquiries || [];
    // Send inquiries (most recent first)
    res.json(inquiries.slice().reverse());
});

// Admin Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Check data.json for custom credentials first (set via Change Password)
    const data = readData();
    if (data.admin && data.admin.username && data.admin.passwordHash) {
        if (username === data.admin.username && verifyPassword(password, data.admin.passwordHash)) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
            return res.status(200).json({ success: true, message: 'Login successful', token });
        }
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Fallback to environment variable defaults (first-time setup)
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ success: true, message: 'Login successful', token });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
});

// Protected Route: Change Admin Credentials
app.post('/api/change-credentials', authenticateToken, (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword || !newUsername || !newPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (newUsername.length < 4) {
        return res.status(400).json({ error: 'Username must be at least 4 characters.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Verify current password
    const data = readData();
    let isValid = false;

    if (data.admin && data.admin.username && data.admin.passwordHash) {
        // Check against stored hashed credentials
        isValid = verifyPassword(currentPassword, data.admin.passwordHash);
    } else {
        // Check against env var defaults (first-time change)
        isValid = (currentPassword === ADMIN_PASS);
    }

    if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Save new credentials (hashed)
    data.admin = {
        username: newUsername.trim().toLowerCase(),
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date().toISOString()
    };
    writeData(data);

    res.json({ success: true, message: 'Credentials updated successfully! Please login again.' });
});



// Public Route: Fetch all dynamic data (excluding private inquiries)
app.get('/api/data', (req, res) => {
    const data = readData();
    const { inquiries, ...publicData } = data;
    res.json(publicData);
});

// Protected Route: Update Settings
app.post('/api/settings', authenticateToken, (req, res) => {
    const { settings } = req.body;
    if(!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Invalid settings data' });

    const data = readData();
    data.settings = { ...data.settings, ...settings };
    writeData(data);

    res.json({ success: true, message: 'Settings updated successfully' });
});

// Protected Route: Update Courses
app.post('/api/courses', authenticateToken, (req, res) => {
    const { courses } = req.body;
    if(!courses || !Array.isArray(courses)) return res.status(400).json({ error: 'Invalid courses data' });

    const data = readData();
    data.courses = courses;
    writeData(data);

    res.json({ success: true, message: 'Courses updated successfully' });
});

// Protected Route: Update Staff
app.post('/api/staff', authenticateToken, (req, res) => {
    const { staff } = req.body;
    if(!staff || !Array.isArray(staff)) return res.status(400).json({ error: 'Invalid staff data' });

    const data = readData();
    data.staff = staff;
    writeData(data);

    res.json({ success: true, message: 'Staff updated successfully' });
});

// Protected Route: Update Testimonials
app.post('/api/testimonials', authenticateToken, (req, res) => {
    const { testimonials } = req.body;
    if(!testimonials || !Array.isArray(testimonials)) return res.status(400).json({ error: 'Invalid testimonials data' });

    const data = readData();
    data.testimonials = testimonials;
    writeData(data);

    res.json({ success: true, message: 'Testimonials updated successfully' });
});

// Protected Route: Update Gallery
app.post('/api/gallery', authenticateToken, (req, res) => {
    const { gallery } = req.body;
    if(!gallery || !Array.isArray(gallery)) return res.status(400).json({ error: 'Invalid gallery data' });

    const data = readData();
    data.gallery = gallery;
    writeData(data);

    res.json({ success: true, message: 'Gallery updated successfully' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});