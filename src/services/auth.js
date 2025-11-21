const axios = require('axios');
const {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  DatabaseError
} = require('../utils/errors');

class AuthService {
  constructor(dependencies) {
    this.auth = dependencies.auth;
    this.db = dependencies.db;
    this.config = dependencies.config;
  }

  /**
   * Login avec Firebase Auth REST API
   */
  async login(req) {
    const { email, password } = req.body;

    const FIREBASE_API_KEY = this.config.getFirebaseApiKey();
    
    if (!FIREBASE_API_KEY) {
      throw new ValidationError('Firebase API key not configured');
    }

    try {
      // Appeler l'API REST Firebase Auth
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
      const userDoc = await this.db.collection('users').doc(localId).get();

      if (!userDoc.exists) {
        throw new NotFoundError('User not found in database');
      }

      const userData = userDoc.data();

      return {
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
      };
    } catch (error) {
      if (error.response?.data?.error) {
        const errorCode = error.response.data.error.message;
        
        if (errorCode === 'EMAIL_NOT_FOUND') {
          throw new AuthenticationError('Email not found');
        }
        if (errorCode === 'INVALID_PASSWORD') {
          throw new AuthenticationError('Invalid password');
        }
        if (errorCode === 'USER_DISABLED') {
          throw new AuthenticationError('User account disabled');
        }
      }
      
      throw new AuthenticationError('Login failed: ' + error.message);
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token required');
    }

    const FIREBASE_API_KEY = this.config.getFirebaseApiKey();
    
    if (!FIREBASE_API_KEY) {
      throw new ValidationError('Firebase API key not configured');
    }

    try {
      const response = await axios.post(
        `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        }
      );

      return {
        success: true,
        token: response.data.id_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      throw new AuthenticationError('Token refresh failed: ' + error.message);
    }
  }

  /**
   * Logout
   */
  async logout(req) {
    const userId = req.user.uid;

    try {
      await this.db.collection('users').doc(userId).update({
        fcmToken: null,
        lastLogout: new Date()
      });

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      throw new DatabaseError('Logout failed: ' + error.message);
    }
  }

  /**
   * Générer custom token
   */
  async generateCustomToken(req) {
    const { uid } = req.body;

    if (!uid) {
      throw new ValidationError('User UID required');
    }

    try {
      const customToken = await this.auth.createCustomToken(uid);

      return {
        success: true,
        customToken
      };
    } catch (error) {
      throw new DatabaseError('Failed to generate custom token: ' + error.message);
    }
  }

  /**
   * Reset password avec token
   */
  async resetPassword(req) {
    const { token, newPassword } = req.body;

    try {
      // Trouver l'utilisateur avec ce token
      const usersSnapshot = await this.db.collection('users')
        .where('inviteToken', '==', token)
        .where('needsPasswordReset', '==', true)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        throw new NotFoundError('Invalid or expired token');
      }

      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;

      // Mettre à jour le mot de passe
      await this.auth.updateUser(userId, {
        password: newPassword
      });

      // Mettre à jour Firestore
      await this.db.collection('users').doc(userId).update({
        needsPasswordReset: false,
        inviteToken: null,
        passwordResetAt: new Date()
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to reset password: ' + error.message);
    }
  }

  /**
   * Vérifier token invitation
   */
  async verifyToken(req) {
    const { token } = req.body;

    try {
      const usersSnapshot = await this.db.collection('users')
        .where('inviteToken', '==', token)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return {
          valid: false,
          error: 'Invalid token'
        };
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();

      return {
        valid: true,
        user: {
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to verify token: ' + error.message);
    }
  }
}

module.exports = AuthService;