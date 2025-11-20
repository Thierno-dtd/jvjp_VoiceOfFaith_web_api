// src/services/user.service.js
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { sendInvitationEmail } = require('./email.service');

class UserService {
  constructor() {
    this.auth = admin.auth();
    this.db = admin.firestore();
  }

  /**
   * Inviter un utilisateur
   */
  async inviteUser(data, invitedBy) {
    try {
      const { email, role, displayName } = data;

      // Vérifier si l'utilisateur existe déjà
      try {
        await this.auth.getUserByEmail(email);
        return {
          success: false,
          status: 400,
          error: 'User with this email already exists'
        };
      } catch (error) {
        // L'utilisateur n'existe pas, on peut continuer
      }

      const tempPassword = uuidv4().substring(0, 12);
      const inviteToken = uuidv4();

      // Créer l'utilisateur dans Firebase Auth
      const userRecord = await this.auth.createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: false
      });

      // Créer le document utilisateur dans Firestore
      await this.db.collection('users').doc(userRecord.uid).set({
        email,
        displayName,
        role,
        photoUrl: null,
        fcmToken: null,
        createdAt: new Date(),
        needsPasswordReset: true,
        inviteToken,
        invitedBy: invitedBy.uid,
        invitedAt: new Date()
      });

      // Envoyer l'email d'invitation
      await sendInvitationEmail({
        email,
        displayName,
        inviteToken,
        role
      });

      return {
        success: true,
        message: 'User invited successfully',
        userId: userRecord.uid
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer tous les utilisateurs
   */
  async getAllUsers({ role, limit, page }) {
    try {
      let query = this.db.collection('users');

      if (role) {
        query = query.where('role', '==', role);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
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

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getUserById(id) {
    try {
      const doc = await this.db.collection('users').doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'User not found'
        };
      }

      return {
        success: true,
        user: {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour le rôle d'un utilisateur
   */
  async updateUserRole(id, role) {
    try {
      await this.db.collection('users').doc(id).update({
        role,
        updatedAt: new Date()
      });

      return {
        success: true,
        message: 'User role updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Renvoyer l'invitation
   */
  async resendInvitation(id) {
    try {
      const userDoc = await this.db.collection('users').doc(id).get();

      if (!userDoc.exists) {
        return {
          success: false,
          status: 404,
          error: 'User not found'
        };
      }

      const userData = userDoc.data();
      const newInviteToken = uuidv4();

      await this.db.collection('users').doc(id).update({
        inviteToken: newInviteToken,
        inviteResendAt: new Date()
      });

      await sendInvitationEmail({
        email: userData.email,
        displayName: userData.displayName,
        inviteToken: newInviteToken,
        role: userData.role
      });

      return {
        success: true,
        message: 'Invitation resent successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id) {
    try {
      await this.auth.deleteUser(id);
      await this.db.collection('users').doc(id).delete();

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UserService();