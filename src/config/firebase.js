const admin = require('firebase-admin');
const path = require('path');

class FirebaseConfig {
  constructor() {
    this.admin = null;
    this.db = null;
    this.auth = null;
    this.storage = null;
    this.messaging = null;
  }

  /**
   * Initialiser Firebase Admin SDK
   */
  initialize() {
    try {
      // Charger le service account
      const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
      const serviceAccount = require(serviceAccountPath);

      // Initialiser Firebase Admin
      this.admin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      // Instances des services
      this.db = admin.firestore();
      this.auth = admin.auth();
      this.storage = admin.storage();
      this.messaging = admin.messaging();

      console.log('✅ Firebase Admin initialized successfully');

      return this;
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw new Error('Failed to initialize Firebase Admin SDK');
    }
  }

  /**
   * Obtenir l'instance Firestore
   */
  getDb() {
    if (!this.db) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Obtenir l'instance Auth
   */
  getAuth() {
    if (!this.auth) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.auth;
  }

  /**
   * Obtenir l'instance Storage
   */
  getStorage() {
    if (!this.storage) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Obtenir l'instance Messaging
   */
  getMessaging() {
    if (!this.messaging) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.messaging;
  }

  /**
   * Obtenir l'admin Firebase
   */
  getAdmin() {
    if (!this.admin) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return admin;
  }
}

// Export singleton
module.exports = new FirebaseConfig();