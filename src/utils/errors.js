class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Erreur de validation
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }

  toJSON() {
    return {
      success: false,
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        errors: this.errors,
        timestamp: this.timestamp
      }
    };
  }
}

/**
 * Erreur d'authentification
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Erreur d'autorisation
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Erreur de ressource non trouvée
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Erreur de conflit
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Erreur de fichier trop volumineux
 */
class FileTooLargeError extends AppError {
  constructor(maxSize) {
    super(`File size exceeds maximum allowed size of ${maxSize}`, 413, 'FILE_TOO_LARGE');
  }
}

/**
 * Erreur de type de fichier invalide
 */
class InvalidFileTypeError extends AppError {
  constructor(allowedTypes) {
    super(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400, 'INVALID_FILE_TYPE');
  }
}

/**
 * Erreur de service externe
 */
class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Erreur de base de données
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

/**
 * Erreur de configuration
 */
class ConfigurationError extends AppError {
  constructor(message = 'Configuration error') {
    super(message, 500, 'CONFIGURATION_ERROR', false);
  }
}

/**
 * Erreur de rate limiting
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  FileTooLargeError,
  InvalidFileTypeError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  RateLimitError
};