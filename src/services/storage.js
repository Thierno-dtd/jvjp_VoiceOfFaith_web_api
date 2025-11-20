const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

/**
 * Upload un fichier vers Firebase Storage
 * @param {Object} file - Fichier multer
 * @param {string} folder - Dossier de destination
 * @returns {Promise<string>} - URL publique du fichier
 */
async function uploadFileToStorage(file, folder) {
  try {
    const bucket = admin.storage().bucket();
    
    // Générer un nom unique
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;

    // Créer le fichier dans Storage
    const fileUpload = bucket.file(filePath);

    // Upload avec stream
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname
        }
      },
      public: true,
      validation: 'md5'
    });

    // Rendre le fichier public
    await fileUpload.makePublic();

    // Retourner l'URL publique
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    return publicUrl;

  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Supprimer un fichier de Firebase Storage
 * @param {string} fileUrl - URL du fichier
 */
async function deleteFileFromStorage(fileUrl) {
  try {
    const bucket = admin.storage().bucket();
    
    // Extraire le chemin du fichier depuis l'URL
    const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
    const filePath = fileUrl.replace(baseUrl, '');

    await bucket.file(filePath).delete();
    
    console.log(`File deleted: ${filePath}`);

  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Obtenir l'URL signée (temporaire) d'un fichier
 * @param {string} fileUrl - URL du fichier
 * @param {number} expiresIn - Durée de validité en minutes
 * @returns {Promise<string>} - URL signée
 */
async function getSignedUrl(fileUrl, expiresIn = 60) {
  try {
    const bucket = admin.storage().bucket();
    const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
    const filePath = fileUrl.replace(baseUrl, '');

    const [signedUrl] = await bucket.file(filePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 60 * 1000
    });

    return signedUrl;

  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
}

module.exports = {
  uploadFileToStorage,
  deleteFileFromStorage,
  getSignedUrl
};