const multer = require('multer');

// Configuration mémoire (fichiers stockés en buffer)
const storage = multer.memoryStorage();

// Filtres pour différents types de fichiers
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const audioFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files (MP3, WAV, M4A) are allowed'), false);
  }
};

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'), false);
  }
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Middleware pour upload d'image simple
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

// Middleware pour upload d'audio avec thumbnail
const uploadAudio = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      audioFilter(req, file, cb);
    } else if (file.fieldname === 'thumbnail') {
      imageFilter(req, file, cb);
    } else {
      cb(new Error('Unexpected field'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB pour audio
  }
});

// Middleware pour upload de sermon (image + PDF)
const uploadSermon = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image') {
      imageFilter(req, file, cb);
    } else if (file.fieldname === 'pdf') {
      pdfFilter(req, file, cb);
    } else {
      cb(new Error('Unexpected field'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  }
});

// Middleware générique pour un seul fichier
const uploadSingle = (fieldName) => multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  }
}).single(fieldName);

// Gestion des erreurs multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: 'File size exceeds the allowed limit' 
      });
    }
    return res.status(400).json({ 
      error: 'Upload error',
      message: err.message 
    });
  } else if (err) {
    return res.status(400).json({ 
      error: 'Upload error',
      message: err.message 
    });
  }
  next();
};

module.exports = {
  uploadImage,
  uploadAudio,
  uploadSermon,
  uploadSingle,
  handleMulterError
};