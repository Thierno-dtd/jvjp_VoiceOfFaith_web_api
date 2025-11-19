const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyAdminToken } = require('../middleware/auth.middleware');
const { sendNotificationToTopic } = require('../services/notification.service');

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
router.get('/status', async (req, res) => {
  try {
    const db = req.app.locals.db;

    const doc = await db.collection('settings').doc('app_settings').get();

    if (!doc.exists) {
      return res.json({
        success: true,
        live: {
          isLive: false,
          liveYoutubeUrl: null,
          liveTitle: null
        }
      });
    }

    const data = doc.data();
    res.json({
      success: true,
      live: {
        isLive: data.isLive || false,
        liveYoutubeUrl: data.liveYoutubeUrl || null,
        liveTitle: data.liveTitle || null
      }
    });

  } catch (error) {
    console.error('Error fetching live status:', error);
    res.status(500).json({ error: 'Failed to fetch live status' });
  }
});

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
  [
    body('isLive').isBoolean(),
    body('liveYoutubeUrl').optional().trim(),
    body('liveTitle').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { isLive, liveYoutubeUrl, liveTitle } = req.body;
      const db = req.app.locals.db;

      const updateData = {
        isLive,
        updatedAt: new Date(),
        updatedBy: req.user.uid
      };

      if (liveYoutubeUrl !== undefined) {
        updateData.liveYoutubeUrl = liveYoutubeUrl;
      }
      if (liveTitle !== undefined) {
        updateData.liveTitle = liveTitle;
      }

      // Vérifier si le document existe
      const doc = await db.collection('settings').doc('app_settings').get();

      if (!doc.exists) {
        // Créer le document s'il n'existe pas
        await db.collection('settings').doc('app_settings').set({
          ...updateData,
          createdAt: new Date()
        });
      } else {
        // Mettre à jour le document existant
        await db.collection('settings').doc('app_settings').update(updateData);
      }

      // Envoyer notification si le LIVE démarre
      if (isLive) {
        await sendNotificationToTopic('all_users', {
          title: '🔴 LIVE EN DIRECT !',
          body: liveTitle || 'Rejoignez-nous maintenant',
          data: {
            type: 'live',
            url: liveYoutubeUrl || ''
          }
        });
      }

      res.json({
        success: true,
        message: isLive ? 'Live started successfully' : 'Live stopped successfully',
        live: updateData
      });

    } catch (error) {
      console.error('Error updating live status:', error);
      res.status(500).json({ 
        error: 'Failed to update live status',
        message: error.message 
      });
    }
  }
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
  [
    body('title').notEmpty().trim(),
    body('body').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, body } = req.body;
      const db = req.app.locals.db;

      // Récupérer l'URL du live
      const doc = await db.collection('settings').doc('app_settings').get();
      const liveUrl = doc.exists ? doc.data().liveYoutubeUrl : '';

      await sendNotificationToTopic('all_users', {
        title,
        body,
        data: {
          type: 'live',
          url: liveUrl || ''
        }
      });

      res.json({
        success: true,
        message: 'Notification sent successfully'
      });

    } catch (error) {
      console.error('Error sending live notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  }
);

module.exports = router;