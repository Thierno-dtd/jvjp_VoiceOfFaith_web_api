const Audio = {
  collection: 'audios',
  
  schema: {
    title: String,
    description: String,
    audioUrl: String,
    thumbnailUrl: String,
    duration: Number,
    uploadedBy: String,
    uploadedByName: String,
    category: String, // emission, podcast, teaching
    createdAt: Date,
    updatedAt: Date,
    downloads: Number,
    plays: Number
  },

  create(data) {
    return {
      ...data,
      downloads: 0,
      plays: 0,
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

module.exports = Audio;