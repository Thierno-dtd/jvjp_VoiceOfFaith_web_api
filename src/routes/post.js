const express = require('express');
const router = express.Router();
const { verifyModeratorToken } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const PostController = require('../controllers/post');
const postValidators = require('../validators/post');


/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Gestion des posts (images et vidéos)
 */


/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Créer un nouveau post
 *     tags: [Posts]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: media
 *         type: file
 *         required: true
 *       - in: formData
 *         name: type
 *         required: true
 *         type: string
 *         enum: [image, video]
 *       - in: formData
 *         name: category
 *         required: true
 *         type: string
 *         enum: [pensee, pasteur, media]
 *       - in: formData
 *         name: content
 *         required: true
 *         type: string
 *     responses:
 *       201:
 *         description: Post created successfully
 */

router.post(
  '/',
  verifyModeratorToken,
  uploadSingle('media'),
  postValidators.create,
  PostController.create
);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Récupérer tous les posts
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: limit
 *         type: integer
 *       - in: query
 *         name: page
 *         type: integer
 *       - in: query
 *         name: category
 *         type: string
 *       - in: query
 *         name: authorId
 *         type: string
 *     responses:
 *       200:
 *         description: Liste des posts
 */
router.get(
  '/',
  postValidators.getAll,
  PostController.getAll
);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Récupérer un post spécifique
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: ID du post
 *     responses:
 *       200:
 *         description: Post trouvé
 *       404:
 *         description: Post non trouvé
 */
router.get(
  '/:id',
  postValidators.getById,
  PostController.getById
);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Modifier un post existant
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: ID du post
 *       - in: body
 *         name: body
 *         required: true
 *         description: Nouveau contenu du post
 *         schema:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *               example: Nouveau contenu du post
 *     responses:
 *       200:
 *         description: Post modifié avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Post non trouvé
 */
router.put(
  '/:id',
  verifyModeratorToken,
  postValidators.update,
  PostController.update
);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Supprimer un post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: ID du post à supprimer
 *     responses:
 *       200:
 *         description: Post supprimé avec succès
 *       403:
 *         description: Accès interdit
 *       404:
 *         description: Post non trouvé
 */
router.delete(
  '/:id',
  verifyModeratorToken,
  postValidators.delete,
  PostController.delete
);

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Liker un post
 *     tags: [Posts]
 */
router.post(
  '/:id/like',
  postValidators.like,
  PostController.like
);


/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Liker un post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         type: string
 *         description: ID du post à liker
 *     responses:
 *       200:
 *         description: Like ajouté avec succès
 *       404:
 *         description: Post non trouvé
 */
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    await db.collection('posts').doc(id).update({
      likes: (await db.collection('posts').doc(id).get()).data().likes + 1
    });

    res.json({
      success: true,
      message: 'Post liked successfully'
    });

  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

module.exports = router;