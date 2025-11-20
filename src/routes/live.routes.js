const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/auth.middleware');
const LiveController = require('../controllers/live');
const liveValidators = require('../validators/live');

/**
 * @swagger
 * tags:
 *   name: Live
 *   description: Gestion du LIVE et notifications
 */

/**
 * @swagger
 * /api/admin/live/status:
 *   get:
 *     summary: Récupérer le statut actuel du LIVE
 *     tags: [Live]
 *     responses:
 *       200:
 *         description: Statut du live récupéré avec succès
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             live:
 *               type: object
 *               properties:
 *                 isLive:
 *                   type: boolean
 *                   example: false
 *                 liveYoutubeUrl:
 *                   type: string
 *                   nullable: true
 *                   example: "https://youtube.com/live/xxxx"
 *                 liveTitle:
 *                   type: string
 *                   nullable: true
 *                   example: "LIVE du dimanche"
 *       500:
 *         description: Erreur serveur
 */
router.get('/status', LiveController.getStatus);

/**
 * @swagger
 * /api/admin/live/status:
 *   put:
 *     summary: Activer ou désactiver le LIVE
 *     tags: [Live]
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         description: Données pour mettre à jour le statut du live
 *         schema:
 *           type: object
 *           properties:
 *             isLive:
 *               type: boolean
 *               example: true
 *             liveYoutubeUrl:
 *               type: string
 *               example: "https://youtube.com/live/xxxx"
 *             liveTitle:
 *               type: string
 *               example: "LIVE du dimanche"
 *     responses:
 *       200:
 *         description: Live démarré ou arrêté avec succès
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             message:
 *               type: string
 *               example: "Live started successfully"
 *             live:
 *               type: object
 *               properties:
 *                 isLive:
 *                   type: boolean
 *                 liveYoutubeUrl:
 *                   type: string
 *                   nullable: true
 *                 liveTitle:
 *                   type: string
 *                   nullable: true
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                 updatedBy:
 *                   type: string
 *                   example: "uid_admin"
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */

router.put(
  '/status',
  verifyAdminToken,
  liveValidators.updateStatus,
  LiveController.updateStatus
);

/**
 * @swagger
 * /api/admin/live/notify:
 *   post:
 *     summary: Envoyer une notification manuelle pour le LIVE
 *     tags: [Live]
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         description: Contenu de la notification
 *         schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               example: "🔴 LIVE EN DIRECT !"
 *             body:
 *               type: string
 *               example: "Rejoignez-nous maintenant"
 *     responses:
 *       200:
 *         description: Notification envoyée avec succès
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             message:
 *               type: string
 *               example: "Notification sent successfully"
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/notify',
  verifyAdminToken,
  liveValidators.sendNotification,
  LiveController.sendNotification
);

module.exports = router;