const multer = require ("multer")
const path = require("path")
const fs = require("fs")

// Type definitions for multer
interface MulterFile {
  originalname: string;
  mimetype: string;
}

interface MulterCallback {
  (error: Error | null, result?: boolean | string): void;
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/panoramic');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req: any, file: MulterFile, cb: MulterCallback) => {
    cb(null, uploadsDir);
  },
  filename: (req: any, file: MulterFile, cb: MulterCallback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `panoramic-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req: any, file: MulterFile, cb: MulterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG files are allowed for panoramic images'));
  }
};

const uploadPanoramic = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit for 360° images
  }
});

const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 200MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = {
  uploadPanoramic,
  errorHandler
};