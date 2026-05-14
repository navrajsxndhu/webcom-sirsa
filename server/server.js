require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// --- Password Hashing Helpers ---
/**
 * Hashes a plain text password using scrypt.
 * @param {string} password - The plain text password.
 * @returns {string} - The salted and hashed password (salt:hash).
 */
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

// --- CONFIGURATION & SECRETS ---
const JWT_SECRET = process.env.JWT_SECRET || 'webcom_sirsa_secret_token_2026_premium';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const PORT = process.env.PORT || 5000;
const INQUIRY_EXPIRY_HOURS = 50; // Hours until inquiry is deleted
const CLEANUP_CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 Hour

if (!process.env.JWT_SECRET || !process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    console.warn('⚠️ WARNING: Using default security credentials. Please set JWT_SECRET, ADMIN_USER, and ADMIN_PASS in Render Environment for better security.');
}

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

app.use(helmet({ contentSecurityPolicy: false })); // Security Headers
app.use(xss());    // Data Sanitization against XSS
app.use(cors({
    origin: [
        'http://localhost:5000', 
        'http://127.0.0.1:5000', 
        'http://localhost:5500', 
        'http://127.0.0.1:5500', 
        /\.vercel\.app$/, 
        /onrender\.com$/,
        /webcomsirsa\.in$/,
        /www\.webcomsirsa\.in$/
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for Base64 image/video storage

// Rate Limiting for Contact Form
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: { error: 'Too many inquiries from this IP, please try again after 15 minutes.' }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- CORE MIDDLEWARE ---

// Serve uploaded files publicly with explicit CORS
app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
// Serve the frontend client files
app.use(express.static(path.join(__dirname, '../client')));

// 3. Simple Connectivity Tests
app.get('/api/ping', (req, res) => res.send('pong'));

app.get('/api/debug-uploads', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        res.json({ 
            uploadDir, 
            exists: fs.existsSync(uploadDir),
            files: files.slice(-15)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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
    limits: { fileSize: 12 * 1024 * 1024 }, // 12MB limit (Safe for MongoDB Base64 storage)
    fileFilter: function(req, file, cb) {
        if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Only image and video files are allowed'), false);
        }
        cb(null, true);
    }
});

app.post('/api/upload', authenticateToken, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size for persistent storage is 12MB.' });
            }
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        try {
            // Read file and convert to Base64
            const base64Image = fs.readFileSync(req.file.path, { encoding: 'base64' });
            const mimeType = req.file.mimetype;
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            // Delete the temporary file from the ephemeral disk
            fs.unlinkSync(req.file.path);

            res.json({ 
                success: true, 
                message: 'File uploaded securely to cloud storage (Base64)', 
                url: dataUrl 
            });
        } catch (error) {
            console.error('File conversion error:', error);
            res.status(500).json({ error: 'Failed to process image for persistent storage' });
        }
    });
});

// --- AUTH & RECOVERY ---

app.post('/api/recover-access', async (req, res) => {
    const { recoveryKey, newUsername, newPassword } = req.body;
    
    try {
        const admin = await Admin.findOne({ recoveryKey });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid master recovery key' });
        }

        admin.username = newUsername;
        admin.passwordHash = hashPassword(newPassword);
        await admin.save();

        res.json({ success: true, message: 'Credentials reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Recovery failed' });
    }
});

// --- DATABASE LOGIC ---
const dataFilePath = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Schemas
const adminSchema = new mongoose.Schema({
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    recoveryKey: { type: String, required: true }, // Required and not defaulted in schema anymore
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

const staffSchema = new mongoose.Schema({
    name: String,
    role: String,
    bio: String,
    photo: String, // Stores Base64 or URL
    order: { type: Number, default: 0 }
});

const testimonialSchema = new mongoose.Schema({
    student: String,
    score: String,
    review: String,
    photo: String,
    videoUrl: String,
    date: { type: Date, default: Date.now }
});

const gallerySchema = new mongoose.Schema({
    url: String,
    category: String,
    date: { type: Date, default: Date.now }
});

const webDataSchema = new mongoose.Schema({
    settings: { type: Object, default: {} },
    courses: { type: Array, default: [] },
    eventVideos: { type: Array, default: [] }
});

const Admin = mongoose.model('Admin', adminSchema);
const Inquiry = mongoose.model('Inquiry', inquirySchema);
const WebData = mongoose.model('WebData', webDataSchema);
const Staff = mongoose.model('Staff', staffSchema);
const Testimonial = mongoose.model('Testimonial', testimonialSchema);
const GalleryItem = mongoose.model('GalleryItem', gallerySchema);

let isMongoConnected = false;

if (MONGODB_URI) {
    console.log("MONGODB_URI detected. Attempting to connect...");
    // Log a masked version for debugging
    const maskedUri = MONGODB_URI.replace(/\/\/.*@/, "//****:****@");
    console.log("Connecting to:", maskedUri);

    const connectMongo = async () => {
        try {
            await mongoose.connect(MONGODB_URI);
            console.log("✅ SUCCESS: Connected to MongoDB Atlas");
            isMongoConnected = true;
            await migrateDataIfNeeded();
        } catch (err) {
            console.error("❌ FAILED: MongoDB connection error:", err.message);
            isMongoConnected = false;
        }
    };
    connectMongo();
} else {
    console.log("⚠️ WARNING: No MONGODB_URI found in environment variables. Falling back to local data.json.");
}

// Migration Logic: Move data from JSON to MongoDB
async function migrateDataIfNeeded() {
    try {
        const webDataCount = await WebData.countDocuments();
        const staffCount = await Staff.countDocuments();
        const galleryCount = await GalleryItem.countDocuments();

        // Migrate if any core collection is empty, or if forced
        if (webDataCount === 0 || staffCount === 0 || galleryCount === 0 || process.env.FORCE_SYNC === 'true') {
            console.log("MIGRATION/SYNC: Syncing MongoDB with data.json...");
            if (!fs.existsSync(dataFilePath)) return;
            
            const localData = JSON.parse(fs.readFileSync(dataFilePath));
            const { inquiries, admin, staff, testimonials, gallery, ...publicData } = localData;
            
            // 1. Migrate Public Data (Settings, Courses, Videos)
            await WebData.deleteMany({});
            await new WebData(publicData).save();

            // 2. Migrate Staff to individual documents
            if (staff && staff.length > 0) {
                await Staff.deleteMany({});
                await Staff.insertMany(staff);
            }

            // 3. Migrate Testimonials to individual documents
            if (testimonials && testimonials.length > 0) {
                await Testimonial.deleteMany({});
                await Testimonial.insertMany(testimonials);
            }

            // 4. Migrate Gallery to individual documents
            if (gallery && gallery.length > 0) {
                await GalleryItem.deleteMany({});
                await GalleryItem.insertMany(gallery);
            }

            // 5. Migrate Admin Credentials
            const adminCount = await Admin.countDocuments();
            if (adminCount === 0 && admin && admin.username) {
                console.log("Migrating Admin credentials...");
                await new Admin({
                    username: admin.username,
                    passwordHash: admin.passwordHash,
                    recoveryKey: admin.recoveryKey || 'WEBCOM-RESET-2026'
                }).save();
            }

            console.log("Migration/Sync successful.");
        }
    } catch (err) {
        console.error("Migration failed:", err);
    }
}

const readData = async () => {
    try {
        if (isMongoConnected) {
            const dbData = await WebData.findOne();
            const inquiries = await Inquiry.find().sort({ date: -1 });
            const data = dbData ? dbData.toObject() : { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], eventVideos: [] };
            data.inquiries = inquiries; // Include inquiries from MongoDB
            return data;
        }
        
        // Fallback to local file (Non-persistent on Vercel)
        if (fs.existsSync(dataFilePath)) {
            const rawData = fs.readFileSync(dataFilePath);
            const parsed = JSON.parse(rawData);
            if (!parsed.inquiries) parsed.inquiries = []; // Ensure inquiries exists
            return parsed;
        }
        return { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], eventVideos: [], inquiries: [] };
    } catch (error) {
        console.error("Data Read Error:", error);
        return { settings: {}, courses: [], gallery: [], staff: [], testimonials: [], eventVideos: [], inquiries: [] };
    }
};

// System Health/Status Check
app.get('/api/system-status', (req, res) => {
    const hasUri = !!process.env.MONGODB_URI;
    const maskedUri = hasUri ? process.env.MONGODB_URI.replace(/\/\/.*@/, "//****:****@") : 'Not Found';
    
    res.json({
        database: isMongoConnected ? 'MongoDB Atlas (Persistent)' : 'Local File (Ephemeral)',
        connected: isMongoConnected,
        uriDetected: hasUri,
        maskedUri: maskedUri,
        environment: process.env.NODE_ENV || 'production'
    });
});

const writeData = async (data) => {
    try {
        if (isMongoConnected) {
            const { inquiries, admin, ...publicData } = data;
            await WebData.findOneAndUpdate({}, publicData, { upsert: true });
            return;
        }
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Data Write Error:", error);
    }
};

// --- ROUTES ---

// Inquiries are now persisted to MongoDB if available
app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
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
        res.status(200).json({ success: true, message: 'Inquiry received successfully!' });
    } catch (error) {
        console.error("Contact API Error:", error);
        res.status(500).json({ error: 'Failed to process inquiry.' });
    }
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
    try {
        const data = await readData();
        const staff = await Staff.find().sort({ order: 1 });
        const testimonials = await Testimonial.find().sort({ date: -1 });
        const gallery = await GalleryItem.find().sort({ date: -1 });

        const { inquiries, admin, ...publicData } = data;
        
        // Merge individual collections into the public response
        res.json({
            ...publicData,
            staff,
            testimonials,
            gallery
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
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
    try {
        const { staff } = req.body;
        if (isMongoConnected) {
            await Staff.deleteMany({});
            await Staff.insertMany(staff);
        } else {
            const data = await readData();
            data.staff = staff;
            await writeData(data);
        }
        res.json({ success: true, message: 'Staff updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update staff' });
    }
});

// Protected Route: Update Testimonials
app.post('/api/testimonials', authenticateToken, async (req, res) => {
    try {
        const { testimonials } = req.body;
        if (isMongoConnected) {
            await Testimonial.deleteMany({});
            await Testimonial.insertMany(testimonials);
        } else {
            const data = await readData();
            data.testimonials = testimonials;
            await writeData(data);
        }
        res.json({ success: true, message: 'Testimonials updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update testimonials' });
    }
});

// Protected Route: Update Gallery
app.post('/api/gallery', authenticateToken, async (req, res) => {
    try {
        const { gallery } = req.body;
        if (isMongoConnected) {
            await GalleryItem.deleteMany({});
            await GalleryItem.insertMany(gallery);
        } else {
            const data = await readData();
            data.gallery = gallery;
            await writeData(data);
        }
        res.json({ success: true, message: 'Gallery updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update gallery' });
    }
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

// --- AUTO-DELETE OLD INQUIRIES (Cleanup Task) ---
const EXPIRY_TIME = INQUIRY_EXPIRY_HOURS * 60 * 60 * 1000;

setInterval(async () => {
    console.log("Running inquiry cleanup task...");
    const now = Date.now();
    const expiryDate = new Date(now - EXPIRY_TIME);

    if (isMongoConnected) {
        try {
            const result = await Inquiry.deleteMany({ date: { $lt: expiryDate } });
            if (result.deletedCount > 0) {
                console.log(`MongoDB Cleanup: Removed ${result.deletedCount} expired inquiries.`);
            }
        } catch (err) {
            console.error("MongoDB Cleanup Error:", err);
        }
    }

    // Also cleanup local data.json if it exists (for safety/local dev)
    try {
        const data = await readData();
        if (data.inquiries && data.inquiries.length > 0) {
            const initialCount = data.inquiries.length;
            data.inquiries = data.inquiries.filter(inq => {
                const inqTime = new Date(inq.date).getTime();
                return (now - inqTime) < EXPIRY_TIME;
            });

            if (data.inquiries.length < initialCount) {
                await writeData(data);
                console.log(`Local Cleanup: Removed ${initialCount - data.inquiries.length} expired inquiries.`);
            }
        }
    } catch (err) {
        console.error("Local Cleanup Error:", err);
    }
}, CLEANUP_CHECK_INTERVAL);

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`Uploads path: ${uploadDir}`);
});

app.use((err, req, res, next) => { console.error('GLOBAL ERROR:', err); res.status(500).json({ error: err.message || 'Internal Server Error' }); });

