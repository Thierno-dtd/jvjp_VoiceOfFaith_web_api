const User = {
  collection: 'users',
  
  schema: {
    email: String,
    displayName: String,
    role: String, // user, pasteur, media, admin
    photoUrl: String,
    fcmToken: String,
    createdAt: Date,
    needsPasswordReset: Boolean,
    inviteToken: String,
    invitedBy: String,
    invitedAt: Date,
    updatedAt: Date,
    lastLogout: Date,
    passwordResetAt: Date
  },

  create(data) {
    return {
      ...data,
      createdAt: new Date(),
      needsPasswordReset: data.needsPasswordReset !== undefined ? data.needsPasswordReset : false
    };
  },

  update(data) {
    return {
      ...data,
      updatedAt: new Date()
    };
  }
};

module.exports = User;