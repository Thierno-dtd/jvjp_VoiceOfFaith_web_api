const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyModeratorToken } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
const { uploadFileToStorage } = require('../services/storage.service');
const { sendNotificationToTopic } = require('../services/notification.service');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Gestion des événements
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Créer un nouvel événement
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Événement de fin d'année"
 *               description:
 *                 type: string
 *                 example: "Célébration de la fin de l'année"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *               location:
 *                 type: string
 *                 example: "Lyon"
 *               dailySummaries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     summary:
 *                       type: string
 *                       example: "Récapitulatif du jour"
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Événement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Event created successfully"
 *                 eventId:
 *                   type: string
 *                   example: "abc123"
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
router.post(
  '/',
  verifyModeratorToken,
  uploadSingle('image'),
  [
    body('title').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('location').notEmpty().trim(),
    body('dailySummaries').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, startDate, endDate, location, dailySummaries } = req.body;
      const db = req.app.locals.db;

      // Upload image
      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadFileToStorage(req.file, 'events');
      }

      // Parser les daily summaries si fourni en JSON string
      let parsedDailySummaries = [];
      if (dailySummaries) {
        parsedDailySummaries = typeof dailySummaries === 'string' 
          ? JSON.parse(dailySummaries)
          : dailySummaries;
        
        // Convertir les dates en Timestamp
        parsedDailySummaries = parsedDailySummaries.map(summary => ({
          ...summary,
          date: new Date(summary.date)
        }));
      }

      // Créer l'événement
      const eventData = {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl: imageUrl || '',
        location,
        dailySummaries: parsedDailySummaries,
        createdAt: new Date()
      };

      const docRef = await db.collection('events').add(eventData);

      // Envoyer notification
      await sendNotificationToTopic('all_users', {
        title: '📅 Nouvel événement',
        body: title,
        data: {
          type: 'event',
          eventId: docRef.id
        }
      });

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        eventId: docRef.id
      });

    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ 
        error: 'Failed to create event',
        message: error.message 
      });
    }
  }
);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Récupérer tous les événements
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre maximum d'événements à retourner
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page à retourner
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: boolean
 *         description: Filtrer uniquement les événements à venir
 *     responses:
 *       200:
 *         description: Liste des événements récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *       500:
 *         description: Erreur serveur
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { limit = 20, page = 1, upcoming } = req.query;

    let query = db.collection('events');

    // Filtrer les événements à venir
    if (upcoming === 'true') {
      query = query.where('startDate', '>=', new Date());
    }

    const snapshot = await query
      .orderBy('startDate', upcoming === 'true' ? 'asc' : 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();

    const events = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
        dailySummaries: data.dailySummaries?.map(s => ({
          ...s,
          date: s.date.toDate()
        })) || []
      });
    });

    res.json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Récupérer un événement par son ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'événement
 *     responses:
 *       200:
 *         description: Événement récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('events').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const data = doc.data();
    res.json({
      success: true,
      event: {
        id: doc.id,
        ...data,
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
        createdAt: data.createdAt.toDate(),
        dailySummaries: data.dailySummaries?.map(s => ({
          ...s,
          date: s.date.toDate()
        })) || []
      }
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Modifier un événement existant
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'événement à modifier
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               location:
 *                 type: string
 *               dailySummaries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     summary:
 *                       type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Événement mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Event updated successfully"
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put(
  '/:id',
  verifyModeratorToken,
  uploadSingle('image'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const db = req.app.locals.db;

      const doc = await db.collection('events').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const updateData = {
        updatedAt: new Date()
      };

      // Update fields si fournis
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      if (req.body.location) updateData.location = req.body.location;

      // Upload nouvelle image si fournie
      if (req.file) {
        updateData.imageUrl = await uploadFileToStorage(req.file, 'events');
      }

      // Update daily summaries si fourni
      if (req.body.dailySummaries) {
        let parsedSummaries = typeof req.body.dailySummaries === 'string' 
          ? JSON.parse(req.body.dailySummaries)
          : req.body.dailySummaries;
        
        updateData.dailySummaries = parsedSummaries.map(summary => ({
          ...summary,
          date: new Date(summary.date)
        }));
      }

      await db.collection('events').doc(id).update(updateData);

      res.json({
        success: true,
        message: 'Event updated successfully'
      });

    } catch (error) {
      console.error('Error updating event:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Supprimer un événement
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'événement à supprimer
 *     responses:
 *       200:
 *         description: Événement supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Event deleted successfully"
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete('/:id', verifyModeratorToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('events').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await db.collection('events').doc(id).delete();

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;