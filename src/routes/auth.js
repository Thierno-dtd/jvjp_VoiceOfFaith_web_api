const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyFirebaseToken } = require('../middleware/auth');
const authController = require('../controllers/auth');

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
router.post('/login', 
  [body('email').isEmail(), body('password').notEmpty()],
  authController.login
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
router.post('/refresh', authController.refreshToken);

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
router.post('/logout', verifyFirebaseToken, authController.logout);

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
  authController.generateCustomToken
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
  authController.resetPassword
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
router.post('/verify-token', authController.verifyToken);

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
router.get('/me', verifyFirebaseToken, authController.getMe);

module.exports = router;