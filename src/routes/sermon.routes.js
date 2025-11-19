const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyModeratorToken } = require('../middleware/auth.middleware');
const { uploadSermon } = require('../middleware/upload.middleware');
const { uploadFileToStorage } = require('../services/storage.service');
const { sendNotificationToTopic } = require('../services/notification.service');


/**
 * @swagger
 * tags:
 *   name: Sermons
 *   description: Gestion des sermons
 */

/**
 * @swagger
 * /api/sermons:
 *   post:
 *     summary: Upload un nouveau sermon (image + PDF)
 *     tags: [Sermons]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               image:
 *                 type: string
 *                 format: binary
 *               pdf:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Sermon uploaded successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */

router.post(
  '/',
  verifyModeratorToken,
  uploadSermon.fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ]),
  [
    body('title').notEmpty().trim(),
    body('date').isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.files || !req.files.image || !req.files.pdf) {
        return res.status(400).json({ 
          error: 'Image and PDF files are required' 
        });
      }

      const { title, date } = req.body;
      const db = req.app.locals.db;

      // Upload image
      const imageFile = req.files.image[0];
      const imageUrl = await uploadFileToStorage(imageFile, 'sermons/images');

      // Upload PDF
      const pdfFile = req.files.pdf[0];
      const pdfUrl = await uploadFileToStorage(pdfFile, 'sermons/pdfs');

      // Créer le document sermon
      const sermonData = {
        title,
        date: new Date(date),
        imageUrl,
        pdfUrl,
        uploadedBy: req.user.uid,
        createdAt: new Date(),
        downloads: 0
      };

      const docRef = await db.collection('sermons').add(sermonData);

      // Envoyer notification
      await sendNotificationToTopic('all_users', {
        title: '📖 Nouveau sermon disponible',
        body: title,
        data: {
          type: 'sermon',
          sermonId: docRef.id
        }
      });

      res.status(201).json({
        success: true,
        message: 'Sermon uploaded successfully',
        sermonId: docRef.id
      });

    } catch (error) {
      console.error('Error uploading sermon:', error);
      res.status(500).json({ 
        error: 'Failed to upload sermon',
        message: error.message 
      });
    }
  }
);

/**
 * @swagger
 * /api/sermons:
 *   get:
 *     summary: Récupérer tous les sermons
 *     tags: [Sermons]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des sermons
 *       500:
 *         description: Erreur serveur
 */

router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { limit = 20, page = 1, year, month } = req.query;

    let query = db.collection('sermons');

    // Filtrer par année/mois si fourni
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    }

    const snapshot = await query
      .orderBy('date', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();

    const sermons = [];
    snapshot.forEach(doc => {
      sermons.push({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      });
    });

    res.json({
      success: true,
      sermons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching sermons:', error);
    res.status(500).json({ error: 'Failed to fetch sermons' });
  }
});

/**
 * @swagger
 * /api/sermons/{id}:
 *   get:
 *     summary: Récupérer un sermon spécifique
 *     tags: [Sermons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sermon trouvé
 *       404:
 *         description: Sermon non trouvé
 *       500:
 *         description: Erreur serveur
 */

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('sermons').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Sermon not found' });
    }

    res.json({
      success: true,
      sermon: {
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate()
      }
    });

  } catch (error) {
    console.error('Error fetching sermon:', error);
    res.status(500).json({ error: 'Failed to fetch sermon' });
  }
});

/**
 * @swagger
 * /api/sermons/{id}:
 *   put:
 *     summary: Modifier un sermon
 *     tags: [Sermons]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sermon modifié
 *       404:
 *         description: Sermon non trouvé
 *       500:
 *         description: Erreur serveur
 */

router.put(
  '/:id',
  verifyModeratorToken,
  [body('title').optional().trim()],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const db = req.app.locals.db;

      const doc = await db.collection('sermons').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Sermon not found' });
      }

      const updateData = {
        updatedAt: new Date()
      };
      if (title) updateData.title = title;

      await db.collection('sermons').doc(id).update(updateData);

      res.json({
        success: true,
        message: 'Sermon updated successfully'
      });

    } catch (error) {
      console.error('Error updating sermon:', error);
      res.status(500).json({ error: 'Failed to update sermon' });
    }
  }
);

/**
 * @swagger
 * /api/sermons/{id}:
 *   delete:
 *     summary: Supprimer un sermon
 *     tags: [Sermons]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sermon supprimé
 *       404:
 *         description: Sermon non trouvé
 *       500:
 *         description: Erreur serveur
 */

router.delete('/:id', verifyModeratorToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('sermons').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Sermon not found' });
    }

    // TODO: Supprimer les fichiers du Storage
    await db.collection('sermons').doc(id).delete();

    res.json({
      success: true,
      message: 'Sermon deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting sermon:', error);
    res.status(500).json({ error: 'Failed to delete sermon' });
  }
});

module.exports = router;