const { v4: uuidv4 } = require('uuid');
const {
  NotFoundError,
  ConflictError,
  DatabaseError
} = require('../utils/errors');

class UserService {
  constructor(dependencies) {
    this.auth = dependencies.auth;
    this.db = dependencies.db;
    this.emailService = null;
  }

  setEmailService(emailService) {
    this.emailService = emailService;
  }

  async inviteUser(data, invitedBy) {
    try {
      const { email, role, displayName } = data;

      try {
        await this.auth.getUserByEmail(email);
        throw new ConflictError('User with this email already exists');
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      const tempPassword = uuidv4().substring(0, 12);
      const inviteToken = uuidv4();

      const userRecord = await this.auth.createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: false
      });

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

      if (this.emailService) {
        await this.emailService.sendInvitation({
          email,
          displayName,
          inviteToken,
          role
        });
      }

      return {
        success: true,
        message: 'User invited successfully',
        userId: userRecord.uid
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to invite user: ' + error.message);
    }
  }

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
      throw new DatabaseError('Failed to fetch users: ' + error.message);
    }
  }

  async getUserById(id) {
    try {
      const doc = await this.db.collection('users').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('User');
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
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch user: ' + error.message);
    }
  }

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
      throw new DatabaseError('Failed to update user role: ' + error.message);
    }
  }

  async resendInvitation(id) {
    try {
      const userDoc = await this.db.collection('users').doc(id).get();

      if (!userDoc.exists) {
        throw new NotFoundError('User');
      }

      const userData = userDoc.data();
      const newInviteToken = uuidv4();

      await this.db.collection('users').doc(id).update({
        inviteToken: newInviteToken,
        inviteResendAt: new Date()
      });

      if (this.emailService) {
        await this.emailService.sendInvitation({
          email: userData.email,
          displayName: userData.displayName,
          inviteToken: newInviteToken,
          role: userData.role
        });
      }

      return {
        success: true,
        message: 'Invitation resent successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to resend invitation: ' + error.message);
    }
  }

  async deleteUser(id) {
    try {
      await this.auth.deleteUser(id);
      await this.db.collection('users').doc(id).delete();

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw new DatabaseError('Failed to delete user: ' + error.message);
    }
  }
}

module.exports = UserService;