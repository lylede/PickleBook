const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Creates an image uploader that saves into uploads/<folder>
function imageUpload(folder) {
  const storage = multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads', folder),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  });
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) =>
      /^image\/(png|jpe?g|webp)$/.test(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Only PNG, JPG or WEBP images are allowed.')),
  });
}

module.exports = { imageUpload };
