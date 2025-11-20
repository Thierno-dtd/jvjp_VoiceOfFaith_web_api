const Sermon = {
  collection: 'sermons',
  
  schema: {
    title: String,
    date: Date,
    imageUrl: String,
    pdfUrl: String,
    uploadedBy: String,
    downloads: Number,
    createdAt: Date,
    updatedAt: Date
  },

  create(data) {
    return {
      ...data,
      downloads: 0,
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

module.exports = Sermon;