const Post = {
  collection: 'posts',
  
  schema: {
    type: String, // image, video
    category: String, // pensee, pasteur, media
    content: String,
    mediaUrl: String,
    thumbnailUrl: String,
    authorId: String,
    authorName: String,
    authorRole: String,
    createdAt: Date,
    updatedAt: Date,
    likes: Number,
    views: Number
  },

  create(data) {
    return {
      ...data,
      likes: 0,
      views: 0,
      createdAt: new Date()
    };
  },

  update(data) {
    return {
      ...data,
      updatedAt: new Date()
    };
  }
};

module.exports = Post;