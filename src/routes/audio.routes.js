const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyModeratorToken } = require('../middleware/auth.middleware');
const { uploadAudio } = require('../middleware/upload.middleware');
const { uploadFileToStorage } = require('../services/storage.service');
const { sendNotificationToTopic } = require('../services/notification.service');

/**
 * @swagger
 * tags:
 *   name: Audios
 *   description: Gestion des fichiers audio (emissions, podcasts, enseignements)
 */

/**
 * @swagger
 * /api/audios:
 *   post:
 *     summary: Upload d'un nouvel audio (avec fichier audio et optionnellement une miniature)
 *     tags: [Audios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - audio
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Enseignement du dimanche"
 *               description:
 *                 type: string
 *                 example: "Message inspirant du pasteur"
 *               category:
 *                 type: string
 *                 enum: [emission, podcast, teaching]
 *                 example: "teaching"
 *               audio:
 *                 type: string
 *                 format: binary
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Audio uploadé avec succès
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
 *                   example: "Audio uploaded successfully"
 *                 audioId:
 *                   type: string
 *                   example: "abc123"
 *                 audioUrl:
 *                   type: string
 *                   example: "https://storage.example.com/audio.mp3"
 *       400:
 *         description: Erreur de validation ou fichier manquant
 *       500:
 *         description: Erreur serveur
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
 * @swagger
 * /api/audios:
 *   get:
 *     summary: Récupérer tous les fichiers audio avec pagination et filtre par catégorie
 *     tags: [Audios]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Nombre de résultats par page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numéro de la page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [emission, podcast, teaching]
 *         description: Filtrer par catégorie
 *     responses:
 *       200:
 *         description: Liste des audios récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 audios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Audio'
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
 * @swagger
 * /api/audios/{id}:
 *   get:
 *     summary: Récupérer un audio spécifique par ID
 *     tags: [Audios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du fichier audio
 *     responses:
 *       200:
 *         description: Audio récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 audio:
 *                   $ref: '#/components/schemas/Audio'
 *       404:
 *         description: Audio non trouvé
 *       500:
 *         description: Erreur serveur
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
 * @swagger
 * /api/audios/{id}:
 *   put:
 *     summary: Modifier un audio existant (titre et description)
 *     tags: [Audios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du fichier audio
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Nouvelle version du titre"
 *               description:
 *                 type: string
 *                 example: "Nouvelle description"
 *     responses:
 *       200:
 *         description: Audio modifié avec succès
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
 *                   example: "Audio updated successfully"
 *       403:
 *         description: L'utilisateur n'est pas autorisé
 *       404:
 *         description: Audio non trouvé
 *       500:
 *         description: Erreur serveur
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
 * @swagger
 * /api/audios/{id}:
 *   delete:
 *     summary: Supprimer un audio
 *     tags: [Audios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du fichier audio
 *     responses:
 *       200:
 *         description: Audio supprimé avec succès
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
 *                   example: "Audio deleted successfully"
 *       403:
 *         description: L'utilisateur n'est pas autorisé
 *       404:
 *         description: Audio non trouvé
 *       500:
 *         description: Erreur serveur
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