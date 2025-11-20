const express = require('express');
const router = express.Router();
const { verifyModeratorToken } = require('../middleware/auth');
const { uploadSermon } = require('../middleware/upload');
const SermonController = require('../controllers/sermon');
const sermonValidators = require('../validators/sermon');


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
  sermonValidators.create,
  SermonController.create
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

router.get(
  '/',
  sermonValidators.getAll,
  SermonController.getAll
);

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
router.get(
  '/:id',
  sermonValidators.getById,
  SermonController.getById
);

/**
 * @swagger
 * /api/sermons/stats:
 *   get:
 *     summary: Statistiques des sermons
 *     tags: [Sermons]
 */
router.get('/stats', SermonController.getStats);

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
  sermonValidators.update,
  SermonController.update
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
router.delete(
  '/:id',
  verifyModeratorToken,
  sermonValidators.delete,
  SermonController.delete
);

/**
 * @swagger
 * /api/sermons/{id}/download:
 *   post:
 *     summary: Incrémenter le compteur de téléchargements
 *     tags: [Sermons]
 */
router.post(
  '/:id/download',
  sermonValidators.incrementDownloads,
  SermonController.incrementDownloads
);

module.exports = router;