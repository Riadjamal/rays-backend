const express = require('express');
const router = express.Router();
const upload = require('../utils/upload');
const auth = require('../middleware/auth');

// GET /api/upload - Test route
router.get('/test-upload', (req, res) => {
    res.json({ success: true, message: 'Upload service is active at /api/test-upload!' });
});

// POST /api/upload - Single file upload
router.post('/upload', auth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Mock OCR: If it's a "passport" field, return some dummy data
    let ocrData = null;
    if (req.body.type === 'passport') {
        ocrData = {
            passportNumber: '' + Math.floor(10000000 + Math.random() * 90000000),
            firstName: 'PASSPORT',
            lastName: 'HOLDER',
            expiryDate: '2030-12-31'
        };
    }

    res.json({
        success: true,
        data: {
            url: fileUrl,
            filename: req.file.filename,
            ocr: ocrData
        }
    });
});

module.exports = router;
