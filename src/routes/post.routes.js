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
  [
    body('type').isIn(['image', 'video']),
    body('category').isIn(['pensee', 'pasteur', 'media']),
    body('content').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Media file is required' });
      }

      const { type, category, content } = req.body;
      const db = req.app.locals.db;

      // Upload media file
      const folderName = type === 'image' ? 'posts/images' : 'posts/videos';
      const mediaUrl = await uploadFileToStorage(req.file, folderName);

      // Créer le post
      const postData = {
        type,
        category,
        content,
        mediaUrl,
        thumbnailUrl: null, // TODO: Générer thumbnail pour vidéos
        authorId: req.user.uid,
        authorName: req.user.displayName,
        authorRole: req.user.role,
        createdAt: new Date(),
        likes: 0,
        views: 0
      };

      const docRef = await db.collection('posts').add(postData);

      // Envoyer notification selon catégorie
      let notifTitle = '📱 Nouvelle publication';
      if (category === 'pensee') notifTitle = '💭 Nouvelle pensée du jour';
      if (category === 'pasteur') notifTitle = '✝️ Message du pasteur';

      await sendNotificationToTopic('all_users', {
        title: notifTitle,
        body: content.substring(0, 100),
        data: {
          type: 'post',
          postId: docRef.id
        }
      });

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        postId: docRef.id
      });

    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ 
        error: 'Failed to create post',
        message: error.message 
      });
    }
  }
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
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { limit = 20, page = 1, category, authorId } = req.query;

    let query = db.collection('posts');

    if (category) {
      query = query.where('category', '==', category);
    }

    if (authorId) {
      query = query.where('authorId', '==', authorId);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset((parseInt(page) - 1) * parseInt(limit))
      .get();

    const posts = [];
    snapshot.forEach(doc => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      });
    });

    res.json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('posts').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Incrémenter le compteur de vues
    await db.collection('posts').doc(id).update({
      views: (doc.data().views || 0) + 1
    });

    res.json({
      success: true,
      post: {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      }
    });

  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

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
  [body('content').optional().trim()],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const db = req.app.locals.db;

      const doc = await db.collection('posts').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Vérifier que l'utilisateur est l'auteur ou admin
      if (doc.data().authorId !== req.user.uid && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updateData = {
        updatedAt: new Date()
      };
      if (content) updateData.content = content;

      await db.collection('posts').doc(id).update(updateData);

      res.json({
        success: true,
        message: 'Post updated successfully'
      });

    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json({ error: 'Failed to update post' });
    }
  }
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
router.delete('/:id', verifyModeratorToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const doc = await db.collection('posts').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Vérifier que l'utilisateur est l'auteur ou admin
    if (doc.data().authorId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.collection('posts').doc(id).delete();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

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