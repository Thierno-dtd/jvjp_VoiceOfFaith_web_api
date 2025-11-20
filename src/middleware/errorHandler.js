const { AppError } = require('../utils/errors');
const appConfig = require('../config/app');

const logError = (error, req) => {
  const errorInfo = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.uid || 'anonymous',
    timestamp: new Date().toISOString()
  };

  // En production, envoyer à un service de monitoring (Sentry, etc.)
  if (appConfig.isProduction()) {
    // TODO: Intégrer avec un service de monitoring
    console.error('Production Error:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('Development Error:', errorInfo);
  }
};

/**
 * Formater la réponse d'erreur
 */
const formatErrorResponse = (error, req) => {
  if (error.isOperational) {
    return error.toJSON ? error.toJSON() : {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'ERROR',
        statusCode: error.statusCode || 500,
        timestamp: new Date().toISOString()
      }
    };
  }

  if (appConfig.isProduction()) {
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    };
  }

  return {
    success: false,
    error: {
      message: error.message,
      code: error.code || 'INTERNAL_SERVER_ERROR',
      statusCode: error.statusCode || 500,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Middleware de gestion d'erreurs global
 */
const errorHandler = (err, req, res, next) => {
  logError(err, req);

  const statusCode = err.statusCode || err.status || 500;

  const response = formatErrorResponse(err, req);
  
  res.status(statusCode).json(response);
};

/**
 * Gestionnaire pour les routes non trouvées
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Wrapper async pour les routes
 * Évite d'avoir à écrire try/catch partout
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Gestionnaire d'erreurs non capturées
 */
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error(error.name, error.message);
    console.error(error.stack);
    process.exit(1);
  });
};

/**
 * Gestionnaire de promesses rejetées
 */
const handleUnhandledRejections = (server) => {
  process.on('unhandledRejection', (error) => {
    console.error('💥 UNHANDLED REJECTION! Shutting down gracefully...');
    console.error(error.name, error.message);
    console.error(error.stack);
    
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * Gestionnaire de signaux de terminaison
 */
const handleTerminationSignals = (server) => {
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('⚠️  Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleUncaughtExceptions,
  handleUnhandledRejections,
  handleTerminationSignals
};