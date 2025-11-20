const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { verifyModeratorToken } = require('../middleware/auth');
const { uploadAudio } = require('../middleware/upload');
const AudioController = require('../controllers/audio');

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
  AudioController.create
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
router.get('/', AudioController.getAll);

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
router.get('/:id', AudioController.getById);

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
  AudioController.update
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
router.delete('/:id', verifyModeratorToken, AudioController.delete);

/**
 * @swagger
 * /api/audios/{id}/play:
 *   post:
 *     summary: Incrémenter le compteur de lectures
 *     tags: [Audios]
 */
router.post('/:id/play', AudioController.incrementPlays);

/**
 * @swagger
 * /api/audios/{id}/download:
 *   post:
 *     summary: Incrémenter le compteur de téléchargements
 *     tags: [Audios]
 */
router.post('/:id/download', AudioController.incrementDownloads);

module.exports = router;