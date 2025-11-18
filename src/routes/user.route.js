const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { sendInvitationEmail } = require('../services/email.service');
const { verifyAdminToken } = require('../middleware/auth.middleware');

// Middleware pour vérifier que l'utilisateur est admin
router.use(verifyAdminToken);

/**
 * POST /api/admin/users/invite
 * Créer un compte pasteur ou media et envoyer email d'invitation
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

      // Vérifier si l'email existe déjà
      try {
        await auth.getUserByEmail(email);
        return res.status(400).json({ 
          error: 'User with this email already exists' 
        });
      } catch (error) {
        // L'utilisateur n'existe pas, on continue
      }

      // Générer mot de passe temporaire
      const tempPassword = uuidv4().substring(0, 12);
      const inviteToken = uuidv4();

      // Créer l'utilisateur dans Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: false
      });

      // Créer le document dans Firestore
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

      // Envoyer l'email d'invitation
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
 * GET /api/admin/users
 * Récupérer la liste de tous les utilisateurs
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

    // Compter le total
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
 * PUT /api/admin/users/:id/role
 * Changer le rôle d'un utilisateur
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
 * POST /api/admin/users/:id/resend
 * Renvoyer l'email d'invitation
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

    // Générer nouveau token
    const newInviteToken = uuidv4();
    
    await db.collection('users').doc(id).update({
      inviteToken: newInviteToken,
      inviteResendAt: new Date()
    });

    // Renvoyer l'email
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
 * DELETE /api/admin/users/:id
 * Supprimer un utilisateur
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const auth = req.app.locals.auth;
    const db = req.app.locals.db;

    // Supprimer de Firebase Auth
    await auth.deleteUser(id);

    // Supprimer de Firestore
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