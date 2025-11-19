const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { sendInvitationEmail } = require('../services/email.service');
const { verifyAdminToken } = require('../middleware/auth.middleware');

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
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, role, displayName } = req.body;
      const auth = req.app.locals.auth;
      const db = req.app.locals.db;

      // Vérifier si l'utilisateur existe
      try {
        await auth.getUserByEmail(email);
        return res.status(400).json({
          error: 'User with this email already exists'
        });
      } catch (error) {}

      const tempPassword = uuidv4().substring(0, 12);
      const inviteToken = uuidv4();

      const userRecord = await auth.createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: false
      });

      await db.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        role,
        photoUrl: null,
        fcmToken: null,
        createdAt: new Date(),
        needsPasswordReset: true,
        inviteToken,
        invitedBy: req.user.uid,
        invitedAt: new Date()
      });

      await sendInvitationEmail({
        email,
        displayName,
        inviteToken,
        role
      });

      res.status(201).json({
        success: true,
        message: 'User invited successfully',
        userId: userRecord.uid
      });

    } catch (error) {
      console.error('Error inviting user:', error);
      res.status(500).json({
        error: 'Failed to invite user',
        message: error.message
      });
    }
  }
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
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { role, limit = 50, page = 1 } = req.query;

    let query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();

    const users = [];
    snapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      });
    });

    const totalSnapshot = await query.count().get();
    const total = totalSnapshot.data().count;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

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
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { role } = req.body;
      const db = req.app.locals.db;

      await db.collection('users').doc(id).update({
        role,
        updatedAt: new Date()
      });

      res.json({
        success: true,
        message: 'User role updated successfully'
      });

    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
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
router.post('/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const userDoc = await db.collection('users').doc(id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    const newInviteToken = uuidv4();

    await db.collection('users').doc(id).update({
      inviteToken: newInviteToken,
      inviteResendAt: new Date()
    });

    await sendInvitationEmail({
      email: userData.email,
      displayName: userData.displayName,
      inviteToken: newInviteToken,
      role: userData.role
    });

    res.json({
      success: true,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const auth = req.app.locals.auth;
    const db = req.app.locals.db;

    await auth.deleteUser(id);
    await db.collection('users').doc(id).delete();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
