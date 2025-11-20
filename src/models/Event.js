const Event = {
  collection: 'events',
  
  schema: {
    title: String,
    description: String,
    startDate: Date,
    endDate: Date,
    imageUrl: String,
    location: String,
    dailySummaries: Array, // [{ date: Date, summary: String }]
    createdAt: Date,
    updatedAt: Date
  },

  create(data) {
    return {
      ...data,
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

module.exports = Event;