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
        const fileUrl = '/uploads/' + req.file.filename;
        res.json({ success: true, message: 'File uploaded successfully', url: fileUrl });
    });
});

const mongoose = require('mongoose');

// --- DATABASE LOGIC ---
const dataFilePath = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Schemas
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    recoveryKey: { type: String, default: 'WEBCOM-RESET-2026' }, // New field
    updatedAt: { type: Date, default: Date.now }
});

const inquirySchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    course: String,
    message: String,
    date: { type: Date, default: Date.now }
});

const webDataSchema = new mongoose.Schema({
    settings: Object,
    courses: Array,
    gallery: Array,
    staff: Array,
    testimonials: Array,
    eventVideos: Array
});

const Admin = mongoose.model('Admin', adminSchema);
const Inquiry = mongoose.model('Inquiry', inquirySchema);
const WebData = mongoose.model('WebData', webDataSchema);

let isMongoConnected = false;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log("Connected to MongoDB Atlas");
            isMongoConnected = true;
            migrateDataIfNeeded();
        })
        .catch(err => console.error("MongoDB connection error:", err));
} else {
    console.log("No MONGODB_URI found. Falling back to data.json (Non-persistent on Vercel)");
}

// Migration Logic: Move data from JSON to MongoDB
async function migrateDataIfNeeded() {
    try {
        const count = await WebData.countDocuments();
        if (count === 0) {
            console.log("Migrating data from data.json to MongoDB...");
            const localData = JSON.parse(fs.readFileSync(dataFilePath));
            const { inquiries, admin, ...publicData } = localData;
            
            await new WebData(publicData).save();
            if (inquiries) await Inquiry.insertMany(inquiries);
            if (admin) await new Admin(admin).save();
            console.log("Migration successful.");
        }
    } catch (err) {
        console.error("Migration failed:", err);
    }
}

const readData = async () => {
    if (isMongoConnected) {
        const dbData = await WebData.findOne();
        return dbData ? dbData.toObject() : { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], eventVideos: [] };
    }
    try {
        const rawData = fs.readFileSync(dataFilePath);
        return JSON.parse(rawData);
    } catch (error) {
        return { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], eventVideos: [], inquiries: [] };
    }
};

const writeData = async (data) => {
    if (isMongoConnected) {
        const { inquiries, admin, ...publicData } = data;
        await WebData.findOneAndUpdate({}, publicData, { upsert: true });
        return;
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// --- ROUTES ---

// Inquiries are now persisted to MongoDB if available
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, course, message } = req.body;
    
    if(!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required.' });
    }

    const newInquiry = { name, email, phone, course, message, date: new Date() };
    
    if (isMongoConnected) {
        await new Inquiry(newInquiry).save();
    } else {
        const data = await readData();
        if (!data.inquiries) data.inquiries = [];
        data.inquiries.push({ ...newInquiry, id: Date.now() });
        await writeData(data);
    }
    
    console.log("New Inquiry Received:", name);

    setTimeout(() => {
        res.status(200).json({ success: true, message: 'Inquiry received successfully!' });
    }, 800);
});

// Protected Route: Fetch Inquiries
app.get('/api/inquiries', authenticateToken, async (req, res) => {
    if (isMongoConnected) {
        const inquiries = await Inquiry.find().sort({ date: -1 });
        return res.json(inquiries);
    }
    const data = await readData();
    const inquiries = data.inquiries || [];
    res.json(inquiries.slice().reverse());
});

// Admin Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (isMongoConnected) {
        const dbAdmin = await Admin.findOne({ username });
        if (dbAdmin && verifyPassword(password, dbAdmin.passwordHash)) {
            const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
            return res.status(200).json({ success: true, message: 'Login successful', token });
        }
    } else {
        const data = await readData();
        if (data.admin && data.admin.username && data.admin.passwordHash) {
            if (username === data.admin.username && verifyPassword(password, data.admin.passwordHash)) {
                const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
                return res.status(200).json({ success: true, message: 'Login successful', token });
            }
            return res.status(401).json({ error: 'Invalid username or password' });
        }
    }

    // Fallback to environment variable defaults
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        return res.status(200).json({ success: true, message: 'Login successful', token });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
});

// Master Password Reset with Recovery Key (Public Route)
app.post('/api/reset-with-key', async (req, res) => {
    const { recoveryKey, newUsername, newPassword } = req.body;

    if (!recoveryKey || !newUsername || !newPassword) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        if (isMongoConnected) {
            const admin = await Admin.findOne({ recoveryKey: recoveryKey });
            if (!admin) return res.status(401).json({ error: 'Invalid Recovery Key.' });

            const hashedPass = crypto.createHash('sha256').update(newPassword).digest('hex');
            admin.username = newUsername;
            admin.passwordHash = hashedPass;
            admin.updatedAt = new Date();
            await admin.save();
        } else {
            // Local fallback logic
            const data = await readData();
            if (!data.admin || data.admin.recoveryKey !== recoveryKey) {
                return res.status(401).json({ error: 'Invalid Recovery Key.' });
            }
            const hashedPass = crypto.createHash('sha256').update(newPassword).digest('hex');
            data.admin.username = newUsername;
            data.admin.passwordHash = hashedPass;
            await writeData(data);
        }

        res.json({ success: true, message: 'Credentials reset successfully. You can now login.' });
    } catch (error) {
        console.error('Reset Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Protected Route: Get Admin Profile (Username, Recovery Key)
app.get('/api/admin-profile', authenticateToken, async (req, res) => {
    try {
        let admin;
        if (isMongoConnected) {
            admin = await Admin.findOne({});
        } else {
            const data = await readData();
            admin = data.admin;
        }

        if (!admin) return res.status(404).json({ error: 'Admin not found' });

        res.json({
            username: admin.username,
            recoveryKey: admin.recoveryKey || 'WEBCOM-RESET-2026'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Protected Route: Change Admin Credentials
app.post('/api/change-credentials', authenticateToken, async (req, res) => {
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword || !newUsername || !newPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Verify current password
    let isValid = false;
    if (isMongoConnected) {
        const dbAdmin = await Admin.findOne(); // Assuming single admin
        isValid = dbAdmin ? verifyPassword(currentPassword, dbAdmin.passwordHash) : (currentPassword === ADMIN_PASS);
    } else {
        const data = await readData();
        isValid = (data.admin && data.admin.passwordHash) ? verifyPassword(currentPassword, data.admin.passwordHash) : (currentPassword === ADMIN_PASS);
    }

    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect.' });

    // Save new credentials
    const newCreds = {
        username: newUsername.trim().toLowerCase(),
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date().toISOString()
    };

    if (isMongoConnected) {
        await Admin.findOneAndUpdate({}, newCreds, { upsert: true });
    } else {
        const data = await readData();
        data.admin = newCreds;
        await writeData(data);
    }

    res.json({ success: true, message: 'Credentials updated successfully! Please login again.' });
});

// Public Route: Fetch all dynamic data
app.get('/api/data', async (req, res) => {
    const data = await readData();
    const { inquiries, admin, ...publicData } = data;
    res.json(publicData);
});

// Protected Route: Update Settings
app.post('/api/settings', authenticateToken, async (req, res) => {
    const { settings } = req.body;
    const data = await readData();
    data.settings = { ...data.settings, ...settings };
    await writeData(data);
    res.json({ success: true, message: 'Settings updated successfully' });
});

// Protected Route: Update Courses
app.post('/api/courses', authenticateToken, async (req, res) => {
    const { courses } = req.body;
    const data = await readData();
    data.courses = courses;
    await writeData(data);
    res.json({ success: true, message: 'Courses updated successfully' });
});

// Protected Route: Update Staff
app.post('/api/staff', authenticateToken, async (req, res) => {
    const { staff } = req.body;
    const data = await readData();
    data.staff = staff;
    await writeData(data);
    res.json({ success: true, message: 'Staff updated successfully' });
});

// Protected Route: Update Testimonials
app.post('/api/testimonials', authenticateToken, async (req, res) => {
    const { testimonials } = req.body;
    const data = await readData();
    data.testimonials = testimonials;
    await writeData(data);
    res.json({ success: true, message: 'Testimonials updated successfully' });
});

// Protected Route: Update Gallery
app.post('/api/gallery', authenticateToken, async (req, res) => {
    const { gallery } = req.body;
    const data = await readData();
    data.gallery = gallery;
    await writeData(data);
    res.json({ success: true, message: 'Gallery updated successfully' });
});

// Protected Route: Update Event Videos
app.post('/api/event-videos', authenticateToken, async (req, res) => {
    const { eventVideos } = req.body;
    const data = await readData();
    data.eventVideos = eventVideos;
    await writeData(data);
    res.json({ success: true, message: 'Event videos updated successfully' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// --- AUTO-DELETE OLD INQUIRIES (50 Hour Cleanup) ---
const CLEANUP_INTERVAL = 1 * 60 * 60 * 1000; // Check every 1 hour
const EXPIRY_TIME = 50 * 60 * 60 * 1000;    // 50 Hours in milliseconds

setInterval(() => {
    console.log("Running inquiry cleanup task...");
    const data = readData();
    if (!data.inquiries || data.inquiries.length === 0) return;

    const now = Date.now();
    const initialCount = data.inquiries.length;
    
    // Keep only inquiries newer than 50 hours
    data.inquiries = data.inquiries.filter(inq => {
        const inqTime = new Date(inq.date).getTime();
        return (now - inqTime) < EXPIRY_TIME;
    });

    if (data.inquiries.length < initialCount) {
        writeData(data);
        console.log(`Cleanup complete: Removed ${initialCount - data.inquiries.length} expired inquiries.`);
    } else {
        console.log("Cleanup complete: No expired inquiries found.");
    }
}, CLEANUP_INTERVAL);

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});