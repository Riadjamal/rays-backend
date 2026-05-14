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

    const backendUrl = process.env.BACKEND_URL || '';
    const fileUrl = req.file.filename ? `${backendUrl}/uploads/${req.file.filename}` : '';
    
    // If using memory storage (Vercel), we'd usually upload to a cloud provider here.
    // For now, let's at least handle the case where filename might be missing.
    if (process.env.NODE_ENV === 'production' && !req.file.filename) {
        // This is a placeholder - in a real production app on Vercel, 
        // you MUST use a cloud storage provider like Cloudinary or S3.
        console.warn('File upload to local disk is not supported on Vercel production.');
    }

    res.json({
        success: true,
        data: {
            url: fileUrl,
            filename: req.file.filename || 'buffer-upload',
            ocr: ocrData
        }
    });
});

module.exports = router;
