const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyModeratorToken } = require('../middleware/auth.middleware');
const { uploadAudio } = require('../middleware/upload.middleware');
const { uploadFileToStorage } = require('../services/storage.service');
const { sendNotificationToTopic } = require('../services/notification.service');

/**
 * POST /api/audios
 * Upload un nouveau audio (pasteur/media/admin)
 */
router.post(
  '/',
  verifyModeratorToken,
  uploadAudio.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  [
    body('title').notEmpty().trim(),
    body('description').optional().trim(),
    body('category').isIn(['emission', 'podcast', 'teaching'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.files || !req.files.audio) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const { title, description, category } = req.body;
      const db = req.app.locals.db;
      
      // Upload audio file
      const audioFile = req.files.audio[0];
      const audioUrl = await uploadFileToStorage(audioFile, 'audios');

      // Upload thumbnail si présent
      let thumbnailUrl = null;
      if (req.files.thumbnail) {
        const thumbnailFile = req.files.thumbnail[0];
        thumbnailUrl = await uploadFileToStorage(thumbnailFile, 'thumbnails');
      }

      // Créer le document audio
      const audioData = {
        title,
        description: description || '',
        audioUrl,
        thumbnailUrl,
        duration: 0, // À calculer côté client ou via traitement
        uploadedBy: req.user.uid,
        uploadedByName: req.user.displayName,
        category,
        createdAt: new Date(),
        downloads: 0,
        plays: 0
      };

      const docRef = await db.collection('audios').add(audioData);

      // Envoyer notification push
      await sendNotificationToTopic('all_users', {
        title: '🎵 Nouvel audio disponible',
        body: title,
        data: {
          type: 'audio',
          audioId: docRef.id
        }
      });

      res.status(201).json({
        success: true,
        message: 'Audio uploaded successfully',
        audioId: docRef.id,
        audioUrl
      });

    } catch (error) {
      console.error('Error uploading audio:', error);
      res.status(500).json({ 
        error: 'Failed to upload audio',
        message: error.message 
      });
    }
  }
);

/**
 * GET /api/audios
 * Récupérer tous les audios avec pagination
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { limit = 20, page = 1, category } = req.query;

    let query = db.collection('audios');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();

    const audios = [];
    snapshot.forEach(doc => {
      audios.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      });
    });

    res.json({
      success: true,
      audios,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audios:', error);
    res.status(500).json({ error: 'Failed to fetch audios' });
  }
});

/**
 * GET /api/audios/:id
 * Récupérer un audio spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('audios').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.json({
      success: true,
      audio: {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      }
    });

  } catch (error) {
    console.error('Error fetching audio:', error);
    res.status(500).json({ error: 'Failed to fetch audio' });
  }
});

/**
 * PUT /api/audios/:id
 * Modifier un audio
 */
router.put(
  '/:id',
  verifyModeratorToken,
  [
    body('title').optional().trim(),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const db = req.app.locals.db;

      const doc = await db.collection('audios').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Audio not found' });
      }

      // Vérifier que l'utilisateur est le créateur ou admin
      if (doc.data().uploadedBy !== req.user.uid && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.description) updateData.description = req.body.description;
      updateData.updatedAt = new Date();

      await db.collection('audios').doc(id).update(updateData);

      res.json({
        success: true,
        message: 'Audio updated successfully'
      });

    } catch (error) {
      console.error('Error updating audio:', error);
      res.status(500).json({ error: 'Failed to update audio' });
    }
  }
);

/**
 * DELETE /api/audios/:id
 * Supprimer un audio
 */
router.delete('/:id', verifyModeratorToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('audios').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    // Vérifier que l'utilisateur est le créateur ou admin
    if (doc.data().uploadedBy !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // TODO: Supprimer aussi les fichiers du Storage
    await db.collection('audios').doc(id).delete();

    res.json({
      success: true,
      message: 'Audio deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting audio:', error);
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

module.exports = router;