const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend client files automatically
const path = require('path');
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

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
console.log(`Server running on port ${port}`);
});