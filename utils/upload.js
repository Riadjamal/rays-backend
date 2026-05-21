const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists - Only in local development
const uploadDir = path.join(__dirname, '..', 'uploads');
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.warn('Could not create upload directory:', err.message);
    }
}

// Storage Configuration
// On Vercel (Production), we must use Memory Storage because the disk is read-only
const storage = process.env.NODE_ENV === 'production' 
    ? multer.memoryStorage() 
    : multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });

// File Filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // Check both extension and common mimetypes
    const isDoc = file.mimetype === 'application/msword' || 
                 file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isImageOrPdf = /image\/(jpeg|jpg|png)|application\/pdf/.test(file.mimetype);

    if (extname && (isDoc || isImageOrPdf)) {
        return cb(null, true);
    } else {
        cb(new Error('Only images (JPEG/JPG/PNG), PDF, and Word documents (.doc, .docx) are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit (to avoid Vercel 4.5MB body limit after base64 encoding)
    fileFilter: fileFilter
});

module.exports = upload;
