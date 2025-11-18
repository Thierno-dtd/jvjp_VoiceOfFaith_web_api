const admin = require('firebase-admin');

/**
 * Middleware pour vérifier le token Firebase
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Vérifier le token avec Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Récupérer les données utilisateur depuis Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ajouter les infos user à la requête
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data()
    };

    next();

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ 
      error: 'Invalid token',
      message: error.message 
    });
  }
}

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
async function verifyAdminToken(req, res, next) {
  await verifyFirebaseToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Admin access required' 
      });
    }
    next();
  });
}

/**
 * Middleware pour vérifier que l'utilisateur peut modérer (admin, pasteur, media)
 */
async function verifyModeratorToken(req, res, next) {
  await verifyFirebaseToken(req, res, () => {
    const allowedRoles = ['admin', 'pasteur', 'media'];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Moderator access required' 
      });
    }
    next();
  });
}

module.exports = {
  verifyFirebaseToken,
  verifyAdminToken,
  verifyModeratorToken
};