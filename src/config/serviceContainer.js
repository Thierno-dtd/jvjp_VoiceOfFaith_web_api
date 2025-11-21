const firebaseConfig = require('./firebase');
const emailConfig = require('./email');
const appConfig = require('./app');

/**
 * Service Container pour l'injection de dépendances
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.initialized = false;
  }

  /**
   * Initialiser tous les services
   */
  async initialize() {
    if (this.initialized) {
      console.warn('⚠️  Service container already initialized');
      return this;
    }

    try {
      console.log('🚀 Initializing service container...');

      // Valider la configuration
      appConfig.validate();

      // Initialiser Firebase
      firebaseConfig.initialize();

      // Initialiser l'email
      emailConfig.initialize();

      // Enregistrer les dépendances de base
      this.register('db', firebaseConfig.getDb());
      this.register('auth', firebaseConfig.getAuth());
      this.register('storage', firebaseConfig.getStorage());
      this.register('messaging', firebaseConfig.getMessaging());
      this.register('admin', firebaseConfig.getAdmin());
      this.register('emailTransporter', emailConfig.getTransporter());
      this.register('config', appConfig);

      // Initialiser les services métier
      this.initializeBusinessServices();

      // Résoudre les dépendances circulaires
      this.resolveDependencies();

      this.initialized = true;
      console.log('✅ Service container initialized successfully\n');

      appConfig.logConfig();

      return this;
    } catch (error) {
      console.error('❌ Service container initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialiser les services métier avec injection de dépendances
   */
  initializeBusinessServices() {
    // Import des services
    const AuthService = require('../services/auth');
    const AudioService = require('../services/audio');
    const SermonService = require('../services/sermon');
    const EventService = require('../services/event');
    const PostService = require('../services/post');
    const LiveService = require('../services/live');
    const UserService = require('../services/user');
    const StatsService = require('../services/stats');
    const StorageService = require('../services/storage');
    const NotificationService = require('../services/notification');
    const EmailService = require('../services/email');

    // Créer les instances avec injection
    const dependencies = {
      db: this.get('db'),
      auth: this.get('auth'),
      storage: this.get('storage'),
      messaging: this.get('messaging'),
      admin: this.get('admin'),
      emailTransporter: this.get('emailTransporter'),
      config: this.get('config')
    };

    // Services de base (sans dépendances circulaires)
    const storageService = new StorageService(dependencies);
    const notificationService = new NotificationService(dependencies);
    const emailService = new EmailService(dependencies);
    const statsService = new StatsService(dependencies);

    // Enregistrer les services de base
    this.register('storageService', storageService);
    this.register('notificationService', notificationService);
    this.register('emailService', emailService);
    this.register('statsService', statsService);

    // Services métier (avec dépendances circulaires à résoudre)
    const authService = new AuthService(dependencies);
    const audioService = new AudioService(dependencies);
    const sermonService = new SermonService(dependencies);
    const eventService = new EventService(dependencies);
    const postService = new PostService(dependencies);
    const liveService = new LiveService(dependencies);
    const userService = new UserService(dependencies);

    // Enregistrer les services métier
    this.register('authService', authService);
    this.register('audioService', audioService);
    this.register('sermonService', sermonService);
    this.register('eventService', eventService);
    this.register('postService', postService);
    this.register('liveService', liveService);
    this.register('userService', userService);

    console.log('✅ Business services registered');
  }

  /**
   * Résoudre les dépendances circulaires entre services
   */
  resolveDependencies() {
    const storageService = this.get('storageService');
    const notificationService = this.get('notificationService');
    const emailService = this.get('emailService');

    // Injecter storage et notification dans les services qui en ont besoin
    const audioService = this.get('audioService');
    audioService.setStorageService(storageService);
    audioService.setNotificationService(notificationService);

    const sermonService = this.get('sermonService');
    sermonService.setStorageService(storageService);
    sermonService.setNotificationService(notificationService);

    const eventService = this.get('eventService');
    eventService.setStorageService(storageService);
    eventService.setNotificationService(notificationService);

    const postService = this.get('postService');
    postService.setStorageService(storageService);
    postService.setNotificationService(notificationService);

    const liveService = this.get('liveService');
    liveService.setNotificationService(notificationService);

    const userService = this.get('userService');
    userService.setEmailService(emailService);

    console.log('✅ Dependencies resolved');
  }

  /**
   * Enregistrer un service
   */
  register(name, service) {
    if (this.services.has(name)) {
      console.warn(`⚠️  Service '${name}' is already registered. Overwriting...`);
    }
    this.services.set(name, service);
  }

  /**
   * Récupérer un service
   */
  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found in container`);
    }
    return this.services.get(name);
  }

  /**
   * Vérifier si un service existe
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Obtenir tous les noms de services
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Nettoyer le container
   */
  clear() {
    this.services.clear();
    this.initialized = false;
  }
}

// Export singleton
module.exports = new ServiceContainer();