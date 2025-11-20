const admin = require('firebase-admin');
const Post = require('../models/Post');
const { uploadFileToStorage } = require('./storage');
const { sendNotificationToTopic } = require('./notification');

class PostService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Créer un nouveau post
   */
  async createPost(data, file, user) {
    try {
      const { type, category, content } = data;

      // Upload media file
      const folderName = type === 'image' ? 'posts/images' : 'posts/videos';
      const mediaUrl = await uploadFileToStorage(file, folderName);

      // Créer le post
      const postData = Post.create({
        type,
        category,
        content,
        mediaUrl,
        thumbnailUrl: null, // TODO: Générer thumbnail pour vidéos
        authorId: user.uid,
        authorName: user.displayName,
        authorRole: user.role
      });

      const docRef = await this.db.collection(Post.collection).add(postData);

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

      return {
        success: true,
        message: 'Post created successfully',
        postId: docRef.id
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer tous les posts
   */
  async getAllPosts({ limit, page, category, authorId }) {
    try {
      let query = this.db.collection(Post.collection);

      if (category) {
        query = query.where('category', '==', category);
      }

      if (authorId) {
        query = query.where('authorId', '==', authorId);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

      const posts = [];
      snapshot.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        });
      });

      return {
        success: true,
        posts,
        pagination: {
          page,
          limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupérer un post par ID
   */
  async getPostById(id) {
    try {
      const doc = await this.db.collection(Post.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Post not found'
        };
      }

      // Incrémenter le compteur de vues
      await this.db.collection(Post.collection).doc(id).update({
        views: admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        post: {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour un post
   */
  async updatePost(id, data, user) {
    try {
      const doc = await this.db.collection(Post.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Post not found'
        };
      }

      // Vérifier que l'utilisateur est l'auteur ou admin
      if (doc.data().authorId !== user.uid && user.role !== 'admin') {
        return {
          success: false,
          status: 403,
          error: 'Forbidden'
        };
      }

      const updateData = Post.update({});
      if (data.content) updateData.content = data.content;

      await this.db.collection(Post.collection).doc(id).update(updateData);

      return {
        success: true,
        message: 'Post updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un post
   */
  async deletePost(id, user) {
    try {
      const doc = await this.db.collection(Post.collection).doc(id).get();

      if (!doc.exists) {
        return {
          success: false,
          status: 404,
          error: 'Post not found'
        };
      }

      // Vérifier que l'utilisateur est l'auteur ou admin
      if (doc.data().authorId !== user.uid && user.role !== 'admin') {
        return {
          success: false,
          status: 403,
          error: 'Forbidden'
        };
      }

      await this.db.collection(Post.collection).doc(id).delete();

      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Liker un post
   */
  async likePost(id) {
    try {
      await this.db.collection(Post.collection).doc(id).update({
        likes: admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        message: 'Post liked successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PostService();