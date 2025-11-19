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