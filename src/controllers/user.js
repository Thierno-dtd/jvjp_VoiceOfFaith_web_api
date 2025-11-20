// src/controllers/user.controller.js
const UserService = require('../services/user.service');
const { validationResult } = require('express-validator');

class UserController {
  /**
   * Inviter un utilisateur
   */
  async invite(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await UserService.inviteUser(req.body, req.user);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Error inviting user:', error);
      res.status(500).json({
        error: 'Failed to invite user',
        message: error.message
      });
    }
  }

  /**
   * Récupérer tous les utilisateurs
   */
  async getAll(req, res) {
    try {
      const { role, limit = 50, page = 1 } = req.query;

      const result = await UserService.getAllUsers({
        role,
        limit: parseInt(limit),
        page: parseInt(page)
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  /**
   * Mettre à jour le rôle d'un utilisateur
   */
  async updateRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { role } = req.body;

      const result = await UserService.updateUserRole(id, role);

      res.json(result);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  /**
   * Renvoyer l'invitation
   */
  async resendInvitation(req, res) {
    try {
      const { id } = req.params;

      const result = await UserService.resendInvitation(id);

      if (!result.success) {
        return res.status(result.status || 400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({ error: 'Failed to resend invitation' });
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await UserService.deleteUser(id);

      res.json(result);
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await UserService.getUserById(id);

      if (!result.success) {
        return res.status(result.status || 404).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
}

module.exports = new UserController();