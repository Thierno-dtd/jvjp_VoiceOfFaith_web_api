const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/auth');
const StatsController = require('../controllers/stats');

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Statistique
 */

/**
 * @swagger
 * /api/admin/stats/overview:
 *   get:
 *     summary: Récupère les statistiques globales du dashboard
 *     tags: [Stats]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: object
 *                       properties:
 *                         user: { type: number }
 *                         pasteur: { type: number }
 *                         media: { type: number }
 *                         admin: { type: number }
 *                         total: { type: number }
 *                     content:
 *                       type: object
 *                       properties:
 *                         audios: { type: number }
 *                         sermons: { type: number }
 *                         events: { type: number }
 *                         posts: { type: number }
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         totalPlays: { type: number }
 *                         totalDownloads: { type: number }
 *                         avgPlaysPerAudio: { type: number }
 *                     growth:
 *                       type: object
 *                       properties:
 *                         newUsersLast30Days: { type: number }
 *                         newAudiosLast30Days: { type: number }
 */
router.get('/overview', verifyAdminToken, StatsController.getOverview);

/**
 * @swagger
 * /api/admin/stats/audios:
 *   get:
 *     summary: Statistiques détaillées des audios
 *     tags: [Stats]
 *     security:
 *       - AdminAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *         description: Nombre de jours 
 *     responses:
 *       200:
 *         description: Statistiques des audios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 period: { type: string }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total: { type: number }
 *                     byCategory:
 *                       type: object
 *                       properties:
 *                         emission: { type: number }
 *                         podcast: { type: number }
 *                         teaching: { type: number }
 *                     topAudios:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           title: { type: string }
 *                           plays: { type: number }
 *                           downloads: { type: number }
 */
router.get('/audios', verifyAdminToken, StatsController.getAudioStats);

/**
 * @swagger
 * /api/admin/stats/users:
 *   get:
 *     summary: Statistiques des utilisateurs
 *     tags: [Stats]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Statistiques des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total: { type: number }
 *                     byRole:
 *                       type: object
 *                       properties:
 *                         user: { type: number }
 *                         pasteur: { type: number }
 *                         media: { type: number }
 *                         admin: { type: number }
 *                     registrationsByMonth:
 *                       type: object
 *                       additionalProperties:
 *                         type: number
 */
router.get('/users', verifyAdminToken, StatsController.getUserStats);

/**
 * @swagger
 * /api/admin/stats/engagement:
 *   get:
 *     summary: Statistiques d'engagement des utilisateurs
 *     tags: [Stats]
 *     security:
 *       - AdminAuth: []
 *     responses:
 *       200:
 *         description: Statistiques d’engagement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: object
 *                       properties:
 *                         total: { type: number }
 *                         totalViews: { type: number }
 *                         totalLikes: { type: number }
 *                         avgViewsPerPost: { type: number }
 *                     sermons:
 *                       type: object
 *                       properties:
 *                         total: { type: number }
 *                         totalDownloads: { type: number }
 *                         avgDownloadsPerSermon: { type: number }
 */
router.get('/engagement', verifyAdminToken, StatsController.getEngagementStats);

module.exports = router;