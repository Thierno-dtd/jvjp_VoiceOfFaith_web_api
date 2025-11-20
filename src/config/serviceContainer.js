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

      appConfig.validate();

      firebaseConfig.initialize();

      emailConfig.initialize();

      // Enregistrer les dépendances de base
      this.register('db', firebaseConfig.getDb());
      this.register('auth', firebaseConfig.getAuth());
      this.register('storage', firebaseConfig.getStorage());
      this.register('messaging', firebaseConfig.getMessaging());
      this.register('admin', firebaseConfig.getAdmin());
      this.register('emailTransporter', emailConfig.getTransporter());
      this.register('config', appConfig);

      this.initializeBusinessServices();

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
    const AudioService = require('../services/audio');
    const UserService = require('../services/user');
    const SermonService = require('../services/sermon');
    const EventService = require('../services/event');
    const PostService = require('../services/post');
    const LiveService = require('../services/live');
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

    // Enregistrer les services
    this.register('audioService', new AudioService(dependencies));
    this.register('userService', new UserService(dependencies));
    this.register('sermonService', new SermonService(dependencies));
    this.register('eventService', new EventService(dependencies));
    this.register('postService', new PostService(dependencies));
    this.register('liveService', new LiveService(dependencies));
    this.register('statsService', new StatsService(dependencies));
    this.register('storageService', new StorageService(dependencies));
    this.register('notificationService', new NotificationService(dependencies));
    this.register('emailService', new EmailService(dependencies));

    console.log('✅ Business services registered');
  }

  register(name, service) {
    if (this.services.has(name)) {
      console.warn(`⚠️  Service '${name}' is already registered. Overwriting...`);
    }
    this.services.set(name, service);
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found in container`);
    }
    return this.services.get(name);
  }

  has(name) {
    return this.services.has(name);
  }


  getServiceNames() {
    return Array.from(this.services.keys());
  }


  clear() {
    this.services.clear();
    this.initialized = false;
  }
}

module.exports = new ServiceContainer();