const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifyModeratorToken } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
const { uploadFileToStorage } = require('../services/storage.service');
const { sendNotificationToTopic } = require('../services/notification.service');

/**
 * POST /api/posts
 * Créer un nouveau post (image ou vidéo)
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
 * GET /api/posts
 * Récupérer tous les posts
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
 * GET /api/posts/:id
 * Récupérer un post spécifique
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
 * PUT /api/posts/:id
 * Modifier un post
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
 * DELETE /api/posts/:id
 * Supprimer un post
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
 * POST /api/posts/:id/like
 * Liker un post
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