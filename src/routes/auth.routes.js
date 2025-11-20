const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyFirebaseToken } = require('../middleware/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et gestion des utilisateurs
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login utilisateur (Firebase Authentication)
 *     description: Authentifie un utilisateur via Firebase Auth REST API et retourne un idToken + refreshToken.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login réussi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   description: Firebase ID Token
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     uid: { type: string }
 *                     email: { type: string }
 *                     displayName: { type: string }
 *                     role: { type: string }
 *                     photoUrl: { type: string }
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Identifiants invalides
 *       500:
 *         description: Erreur interne
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const auth = req.app.locals.auth;
      const db = req.app.locals.db;

      // Note: Firebase Admin SDK ne peut pas vérifier le password directement
      // On doit utiliser Firebase Auth REST API
      const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
      
      if (!FIREBASE_API_KEY) {
        return res.status(500).json({ 
          error: 'Firebase API key not configured' 
        });
      }

      // Appeler l'API REST Firebase Auth
      const axios = require('axios');
      const authResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          email,
          password,
          returnSecureToken: true
        }
      );

      const { idToken, refreshToken, localId } = authResponse.data;

      // Récupérer les données utilisateur depuis Firestore
      const userDoc = await db.collection('users').doc(localId).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found in database' });
      }

      const userData = userDoc.data();

      res.json({
        success: true,
        message: 'Login successful',
        token: idToken,
        refreshToken,
        user: {
          uid: localId,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          photoUrl: userData.photoUrl
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.response?.data?.error) {
        const errorCode = error.response.data.error.message;
        
        if (errorCode === 'EMAIL_NOT_FOUND') {
          return res.status(401).json({ error: 'Email not found' });
        }
        if (errorCode === 'INVALID_PASSWORD') {
          return res.status(401).json({ error: 'Invalid password' });
        }
        if (errorCode === 'USER_DISABLED') {
          return res.status(401).json({ error: 'User account disabled' });
        }
      }
      
      res.status(500).json({ 
        error: 'Login failed',
        message: error.message 
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Rafraîchir un token Firebase
 *     description: Retourne un nouveau idToken et refreshToken via Firebase Secure Token API.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "AEu4IL25xxxxxxx"
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *       400:
 *         description: Token manquant
 *       401:
 *         description: Refresh token invalide
 *       500:
 *         description: Erreur serveur
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    
    if (!FIREBASE_API_KEY) {
      return res.status(500).json({ 
        error: 'Firebase API key not configured' 
      });
    }

    // Appeler l'API REST Firebase pour refresh
    const axios = require('axios');
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }
    );

    res.json({
      success: true,
      token: response.data.id_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ 
      error: 'Token refresh failed',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Déconnexion utilisateur
 *     security:
 *       - bearerAuth: []
 *     description: Retire le token FCM stocké dans la base pour invalider la session FCM.
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         description: Token invalide ou absent
 *       500:
 *         description: Erreur serveur
 */
router.post('/logout', verifyFirebaseToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user.uid;

    // Supprimer le token FCM de l'utilisateur
    await db.collection('users').doc(userId).update({
      fcmToken: null,
      lastLogout: new Date()
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/generate-custom-token:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Générer un custom token (Admin)
 *     security:
 *       - bearerAuth: []
 *     description: Génère un custom token Firebase pour un utilisateur donné (admin uniquement).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *             properties:
 *               uid:
 *                 type: string
 *                 example: "Zdjsq87sHh72Lk"
 *     responses:
 *       200:
 *         description: Custom token généré
 *       400:
 *         description: UID manquant
 *       403:
 *         description: Accès réservé à l’admin
 *       500:
 *         description: Erreur interne
 */
router.post(
  '/generate-custom-token',
  verifyFirebaseToken,
  async (req, res) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { uid } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'User UID required' });
      }

      const auth = req.app.locals.auth;

      // Générer un custom token
      const customToken = await auth.createCustomToken(uid);

      res.json({
        success: true,
        customToken
      });

    } catch (error) {
      console.error('Custom token generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate custom token',
        message: error.message 
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe d'un utilisateur avec un token d'invitation
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123token"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "newStrongPassword123"
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: Erreur de validation (token manquant ou mot de passe trop court)
 *       404:
 *         description: Token invalide ou expiré
 *       500:
 *         description: Erreur serveur
 */

router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, newPassword } = req.body;
      const db = req.app.locals.db;
      const auth = req.app.locals.auth;

      // Trouver l'utilisateur avec ce token
      const usersSnapshot = await db.collection('users')
        .where('inviteToken', '==', token)
        .where('needsPasswordReset', '==', true)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return res.status(404).json({ 
          error: 'Invalid or expired token' 
        });
      }

      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;

      // Mettre à jour le mot de passe
      await auth.updateUser(userId, {
        password: newPassword
      });

      // Mettre à jour Firestore
      await db.collection('users').doc(userId).update({
        needsPasswordReset: false,
        inviteToken: null,
        passwordResetAt: new Date()
      });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ 
        error: 'Failed to reset password',
        message: error.message 
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/verify-token:
 *   post:
 *     summary: Vérifier si un token d'invitation est valide
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "abc123token"
 *     responses:
 *       200:
 *         description: Token valide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     displayName:
 *                       type: string
 *                       example: "John Doe"
 *                     role:
 *                       type: string
 *                       example: "user"
 *       404:
 *         description: Token invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid token"
 *       500:
 *         description: Erreur serveur
 */

router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    const db = req.app.locals.db;

    const usersSnapshot = await db.collection('users')
      .where('inviteToken', '==', token)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ 
        valid: false,
        error: 'Invalid token' 
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    res.json({
      valid: true,
      user: {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role
      }
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Récupérer les informations de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Infos utilisateur récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                       example: "user123"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     displayName:
 *                       type: string
 *                       example: "John Doe"
 *                     role:
 *                       type: string
 *                       example: "user"
 *       500:
 *         description: Erreur serveur
 */
router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;