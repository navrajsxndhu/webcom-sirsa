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

// Serve the frontend client files automatically
app.use(express.static(path.join(__dirname, '../client')));

const storage = multer.diskStorage({

destination: function(req,file,cb) {
cb(null,'uploads');
},

filename: function(req,file,cb) {
cb(null, Date.now() + '-' + file.originalname);
}

});

const upload = multer({storage});

app.post('/upload', upload.single('file'), (req,res) => {

res.json({
message: 'File uploaded successfully'
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
        return { courses: [], gallery: [] };
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

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
console.log(`Server running on port ${port}`);
});