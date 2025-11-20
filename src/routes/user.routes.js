const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { verifyAdminToken } = require('../middleware/auth.middleware');
const UserController = require('../controllers/user');

// Middleware admin
router.use(verifyAdminToken);

/**
 * @swagger
 * tags:
 *   name: AdminUsers
 *   description: Gestion des utilisateurs (admin)
 */

/**
 * @swagger
 * /api/admin/users/invite:
 *   post:
 *     summary: Inviter un pasteur ou un membre média
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role, displayName]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               role:
 *                 type: string
 *                 enum: [pasteur, media]
 *                 example: "pasteur"
 *               displayName:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       201:
 *         description: Utilisateur invité avec succès
 *       400:
 *         description: Erreur de validation ou utilisateur existe déjà
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/invite',
  [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['pasteur', 'media']),
    body('displayName').notEmpty().trim()
  ],
  UserController.invite
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Récupérer la liste de tous les utilisateurs
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: role
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [user, pasteur, media, admin]
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *       500:
 *         description: Erreur serveur
 */
router.get('/', UserController.getAll);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par ID
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', UserController.getById);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Modifier le rôle d’un utilisateur
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, pasteur, media, admin]
 *     responses:
 *       200:
 *         description: Rôle modifié avec succès
 *       400:
 *         description: Mauvaise requête
 *       500:
 *         description: Erreur serveur
 */
router.put(
  '/:id/role',
  [body('role').isIn(['user', 'pasteur', 'media', 'admin'])],
  UserController.updateRole
);

/**
 * @swagger
 * /api/admin/users/{id}/resend:
 *   post:
 *     summary: Renvoyer l’invitation à un utilisateur
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation renvoyée
 *       404:
 *         description: Utilisateur introuvable
 *       500:
 *         description: Erreur serveur
 */
router.post('/:id/resend', UserController.resendInvitation);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Utilisateur supprimé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', UserController.delete);

module.exports = router;
