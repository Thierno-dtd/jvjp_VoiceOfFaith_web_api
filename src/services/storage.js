const { v4: uuidv4 } = require('uuid');
const { ExternalServiceError } = require('../utils/errors');

class StorageService {
  constructor(dependencies) {
    this.storage = dependencies.storage;
  }

  async uploadFile(file, folder) {
    try {
      const bucket = this.storage.bucket();
      
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      const fileUpload = bucket.file(filePath);

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

      await fileUpload.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading file to storage:', error);
      throw new ExternalServiceError('Storage', 'Failed to upload file');
    }
  }

  async deleteFile(fileUrl) {
    try {
      const bucket = this.storage.bucket();
      
      const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
      const filePath = fileUrl.replace(baseUrl, '');

      await bucket.file(filePath).delete();
      
      console.log(`File deleted: ${filePath}`);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      throw new ExternalServiceError('Storage', 'Failed to delete file');
    }
  }

  async getSignedUrl(fileUrl, expiresIn = 60) {
    try {
      const bucket = this.storage.bucket();
      const baseUrl = `https://storage.googleapis.com/${bucket.name}/`;
      const filePath = fileUrl.replace(baseUrl, '');

      const [signedUrl] = await bucket.file(filePath).getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 60 * 1000
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new ExternalServiceError('Storage', 'Failed to generate signed URL');
    }
  }
}

module.exports = StorageService;