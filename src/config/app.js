class AppConfig {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.port = parseInt(process.env.PORT) || 3000;
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    this.appScheme = process.env.APP_SCHEME || 'voiceoffaith';
    this.webUrl = process.env.WEB_URL || 'http://localhost';
  }


  isProduction() {
    return this.env === 'production';
  }


  isDevelopment() {
    return this.env === 'development';
  }

  getPort() {
    return this.port;
  }

  getFrontendUrl() {
    return this.frontendUrl;
  }


  getAppScheme() {
    return this.appScheme;
  }


  generateDeepLink(path, params = {}) {
    let link = `${this.appScheme}://${path}`;
    
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    if (queryString) {
      link += `?${queryString}`;
    }
    
    return link;
  }


  getUploadLimits() {
    return {
      image: 10 * 1024 * 1024,      
      audio: 100 * 1024 * 1024,     
      video: 200 * 1024 * 1024,     
      pdf: 50 * 1024 * 1024        
    };
  }

  getDefaultPagination() {
    return {
      limit: 20,
      maxLimit: 100
    };
  }

  getRateLimitConfig() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    };
  }

  getJwtConfig() {
    return {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };
  }

  getFirebaseApiKey() {
    return process.env.FIREBASE_API_KEY;
  }

  getCorsConfig() {
    return {
      origin: this.isProduction() 
        ? [this.frontendUrl] 
        : '*',
      credentials: true,
      optionsSuccessStatus: 200
    };
  }

  getLogLevel() {
    return process.env.LOG_LEVEL || 'info';
  }

  validate() {
    const requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'SMTP_USER',
      'SMTP_PASS'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ Application configuration validated');
    return true;
  }

  /**
   * Afficher un résumé de la configuration
   */
  logConfig() {
    console.log('\n📋 Configuration Summary:');
    console.log(`   Environment: ${this.env}`);
    console.log(`   Port: ${this.port}`);
    console.log(`   Frontend URL: ${this.frontendUrl}`);
    console.log(`   App Scheme: ${this.appScheme}`);
    console.log(`   Log Level: ${this.getLogLevel()}\n`);
  }
}

module.exports = new AppConfig();