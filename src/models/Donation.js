const Donation = {
  collection: 'donations',
  
  schema: {
    userId: String,
    userName: String,
    amount: Number,
    type: String, // oneTime, monthly
    paymentMethod: String, // creditCard, paypal, tmoney, flooz
    createdAt: Date,
    message: String,
    isAnonymous: Boolean
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

module.exports = Donation;