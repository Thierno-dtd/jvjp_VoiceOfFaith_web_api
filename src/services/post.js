const {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  DatabaseError
} = require('../utils/errors');

class PostService {
  constructor(dependencies) {
    this.db = dependencies.db;
    this.admin = dependencies.admin;
    this.storageService = null;
    this.notificationService = null;
  }

  setStorageService(storageService) {
    this.storageService = storageService;
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  async createPost(data, file, user) {
    try {
      const { type, category, content } = data;

      if (!file) {
        throw new ValidationError('Media file is required');
      }

      const folderName = type === 'image' ? 'posts/images' : 'posts/videos';
      const mediaUrl = await this.storageService.uploadFile(file, folderName);

      const postData = {
        type,
        category,
        content,
        mediaUrl,
        thumbnailUrl: null,
        authorId: user.uid,
        authorName: user.displayName,
        authorRole: user.role,
        likes: 0,
        views: 0,
        createdAt: new Date()
      };

      const docRef = await this.db.collection('posts').add(postData);

      if (this.notificationService) {
        let notifTitle = '📱 Nouvelle publication';
        if (category === 'pensee') notifTitle = '💭 Nouvelle pensée du jour';
        if (category === 'pasteur') notifTitle = '✝️ Message du pasteur';

        await this.notificationService.sendToTopic('all_users', {
          title: notifTitle,
          body: content.substring(0, 100),
          data: {
            type: 'post',
            postId: docRef.id
          }
        });
      }

      return {
        success: true,
        message: 'Post created successfully',
        postId: docRef.id
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to create post: ' + error.message);
    }
  }

  async getAllPosts({ limit, page, category, authorId }) {
    try {
      let query = this.db.collection('posts');

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
        pagination: { page, limit }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch posts: ' + error.message);
    }
  }

  async getPostById(id) {
    try {
      const doc = await this.db.collection('posts').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Post');
      }

      await this.db.collection('posts').doc(id).update({
        views: this.admin.firestore.FieldValue.increment(1)
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
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch post: ' + error.message);
    }
  }

  async updatePost(id, data, user) {
    try {
      const doc = await this.db.collection('posts').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Post');
      }

      if (doc.data().authorId !== user.uid && user.role !== 'admin') {
        throw new AuthorizationError('You do not have permission to update this post');
      }

      const updateData = { updatedAt: new Date() };
      if (data.content) updateData.content = data.content;

      await this.db.collection('posts').doc(id).update(updateData);

      return {
        success: true,
        message: 'Post updated successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to update post: ' + error.message);
    }
  }

  async deletePost(id, user) {
    try {
      const doc = await this.db.collection('posts').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Post');
      }

      if (doc.data().authorId !== user.uid && user.role !== 'admin') {
        throw new AuthorizationError('You do not have permission to delete this post');
      }

      await this.db.collection('posts').doc(id).delete();

      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to delete post: ' + error.message);
    }
  }

  async likePost(id) {
    try {
      await this.db.collection('posts').doc(id).update({
        likes: this.admin.firestore.FieldValue.increment(1)
      });

      return {
        success: true,
        message: 'Post liked successfully'
      };
    } catch (error) {
      throw new DatabaseError('Failed to like post: ' + error.message);
    }
  }
}

module.exports = PostService;