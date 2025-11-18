/**
 * Générer un slug à partir d'un titre
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Formater une durée en secondes en format lisible
 */
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
};

/**
 * Formater une taille de fichier en format lisible
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Générer un mot de passe aléatoire
 */
const generateRandomPassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
};

/**
 * Vérifier si une date est dans le futur
 */
const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Calculer la différence de jours entre deux dates
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
};

/**
 * Tronquer un texte avec ellipse
 */
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Extraire l'extension d'un nom de fichier
 */
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

/**
 * Valider une URL YouTube
 */
const isValidYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
};

/**
 * Extraire l'ID d'une vidéo YouTube
 */
const extractYouTubeId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * Nettoyer un numéro de téléphone
 */
const cleanPhoneNumber = (phone) => {
  return phone.replace(/\D/g, '');
};

/**
 * Formater un numéro de téléphone
 */
const formatPhoneNumber = (phone) => {
  const cleaned = cleanPhoneNumber(phone);
  if (cleaned.length === 10) {
    return `+241 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6)}`;
  }
  return phone;
};

/**
 * Retarder l'exécution (async sleep)
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry une fonction async en cas d'échec
 */
const retryAsync = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * (i + 1));
    }
  }
};

module.exports = {
  generateSlug,
  formatDuration,
  formatFileSize,
  generateRandomPassword,
  isFutureDate,
  daysBetween,
  truncateText,
  getFileExtension,
  isValidYouTubeUrl,
  extractYouTubeId,
  cleanPhoneNumber,
  formatPhoneNumber,
  sleep,
  retryAsync
};