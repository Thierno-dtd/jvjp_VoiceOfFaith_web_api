const { 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError 
} = require('../utils/errors');
const { asyncHandler } = require('./errorHandler');

const verifyFirebaseToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('No token provided');
  }

  const token = authHeader.split('Bearer ')[1];

  const auth = req.container.get('auth');
  const db = req.container.get('db');

  const decodedToken = await auth.verifyIdToken(token);
  
  const userDoc = await db.collection('users').doc(decodedToken.uid).get();

  if (!userDoc.exists) {
    throw new NotFoundError('User');
  }

  req.user = {
    uid: decodedToken.uid,
    email: decodedToken.email,
    ...userDoc.data()
  };

  next();
});

const verifyAdminToken = asyncHandler(async (req, res, next) => {
  await verifyFirebaseToken(req, res, () => {
    if (req.user.role !== 'admin') {
      throw new AuthorizationError('Admin access required');
    }
    next();
  });
});

const verifyModeratorToken = asyncHandler(async (req, res, next) => {
  await verifyFirebaseToken(req, res, () => {
    const allowedRoles = ['admin', 'pasteur', 'media'];
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError('Moderator access required');
    }
    next();
  });
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const auth = req.container.get('auth');
    const db = req.container.get('db');

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (userDoc.exists) {
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...userDoc.data()
      };
    }
  } catch (error) {
    // Ignorer les erreurs de token en mode optionnel
  }

  next();
});

module.exports = {
  verifyFirebaseToken,
  verifyAdminToken,
  verifyModeratorToken,
  optionalAuth
};