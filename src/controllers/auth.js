const { validationResult } = require('express-validator');
const AuthService = require('../services/auth');

module.exports = {

  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await AuthService.login(req);

      res.json(result);

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const result = await AuthService.refreshToken(req);
      res.json(result);
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({ error: error.message });
    }
  },

  logout: async (req, res) => {
    try {
      const result = await AuthService.logout(req);
      res.json(result);
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  generateCustomToken: async (req, res) => {
    try {
      const result = await AuthService.generateCustomToken(req);
      res.json(result);
    } catch (error) {
      console.error('Custom token error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const result = await AuthService.resetPassword(req);
      res.json(result);
    } catch (error) {
      console.error('Reset error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  verifyToken: async (req, res) => {
    try {
      const result = await AuthService.verifyToken(req);
      res.json(result);
    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  getMe: async (req, res) => {
    try {
      res.json({
        success: true,
        user: req.user
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }
};
