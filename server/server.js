const express = require('express');
const multer = require('multer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Secret key for JWT (In production, use an environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'webcom_super_secret_key_2026';

const app = express();

app.use(cors());
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

filename: function(req,file,cb) {
cb(null, Date.now() + '-' + file.originalname);
}

});

const upload = multer({storage});

app.post('/api/upload', upload.single('file'), (req,res) => {
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

// In-memory array for contact inquiries (can be replaced by DB later)
const inquiries = [];

app.post('/api/contact', (req, res) => {
    const { name, email, phone, course, message } = req.body;
    
    if(!name || !phone) {
        return res.status(400).json({ error: 'Name and Phone are required.' });
    }

    const newInquiry = { id: Date.now(), name, email, phone, course, message, date: new Date() };
    inquiries.push(newInquiry);
    
    console.log("New Inquiry Received:", newInquiry);

    // Simulate network delay for realistic loading state
    setTimeout(() => {
        res.status(200).json({ success: true, message: 'Inquiry received successfully!' });
    }, 800);
});

// Protected Route: Fetch Inquiries
app.get('/api/inquiries', authenticateToken, (req, res) => {
    // Send the in-memory inquiries array (most recent first)
    res.json(inquiries.slice().reverse());
});

// Admin Login Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Hardcoded credentials for Webcom Director
    if (username === 'webcom_admin' && password === 'admin123') {
        // Generate JWT Token valid for 24 hours
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        
        return res.status(200).json({ 
            success: true, 
            message: 'Login successful',
            token: token 
        });
    }

    return res.status(401).json({ error: 'Invalid username or password' });
});

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

// --- DATABASE LOGIC ---
const dataFilePath = path.join(__dirname, 'data.json');

const readData = () => {
    try {
        const rawData = fs.readFileSync(dataFilePath);
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading database:", error);
        return { courses: [], gallery: [], staff: [], testimonials: [] };
    }
};

const writeData = (data) => {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
};

// Public Route: Fetch all dynamic data
app.get('/api/data', (req, res) => {
    res.json(readData());
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

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
console.log(`Server running on port ${port}`);
});