const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// If CLOUDINARY_URL is set, images go to Cloudinary (survives restarts).
// Otherwise they are saved to uploads/<folder> on local disk (for development).
const useCloud = !!process.env.CLOUDINARY_URL;
const cloudinary = useCloud ? require('cloudinary').v2 : null;

function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `picklebook/${folder}`, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

function imageUpload(folder) {
  let storage;
  if (useCloud) {
    storage = multer.memoryStorage();
  } else {
    const dir = path.join(__dirname, '..', '..', 'uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    storage = multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
      },
    });
  }

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) =>
      /^image\/(png|jpe?g|webp)$/.test(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Only PNG, JPG or WEBP images are allowed.')),
  });

  return {
    single(field) {
      const parse = upload.single(field);
      if (!useCloud) return parse;
      const send = async (req, res, next) => {
        try {
          if (req.file) req.file.url = (await uploadToCloudinary(req.file.buffer, folder)).secure_url;
          next();
        } catch (err) { next(err); }
      };
      return [parse, send];
    },
  };
}

function storedUrl(file, folder) {
  return file.url || `/uploads/${folder}/${file.filename}`;
}

module.exports = { imageUpload, storedUrl };