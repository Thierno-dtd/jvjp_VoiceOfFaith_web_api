const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyFirebaseToken } = require('../middleware/auth.middleware');

/**
 * POST /api/auth/reset-password
 * Reset password avec invitation token
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
 * POST /api/auth/verify-token
 * Vérifier si un token d'invitation est valide
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
 * GET /api/auth/me
 * Récupérer les infos de l'utilisateur connecté
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