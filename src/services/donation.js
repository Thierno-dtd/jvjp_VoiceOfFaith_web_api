const {
  NotFoundError,
  ValidationError,
  DatabaseError
} = require('../utils/errors');

class DonationService {
  constructor(dependencies) {
    this.db = dependencies.db;
    this.admin = dependencies.admin;
  }

  async createDonation(data, user) {
    try {
      const { amount, type, paymentMethod, message, isAnonymous } = data;

      if (!amount || amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
      }

      const donationData = {
        userId: user.uid,
        userName: isAnonymous ? 'Anonyme' : user.displayName,
        amount: parseFloat(amount),
        type,
        paymentMethod,
        message: message || null,
        isAnonymous: isAnonymous || false,
        createdAt: new Date()
      };

      const docRef = await this.db.collection('donations').add(donationData);

      return {
        success: true,
        message: 'Donation created successfully',
        donationId: docRef.id
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to create donation: ' + error.message);
    }
  }

  async getAllDonations({ limit, page, type, paymentMethod, userId }) {
    try {
      let query = this.db.collection('donations');

      if (type) {
        query = query.where('type', '==', type);
      }

      if (paymentMethod) {
        query = query.where('paymentMethod', '==', paymentMethod);
      }

      if (userId) {
        query = query.where('userId', '==', userId);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

      const donations = [];
      snapshot.forEach(doc => {
        donations.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        });
      });

      return {
        success: true,
        donations,
        pagination: { page, limit }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch donations: ' + error.message);
    }
  }

  async getDonationById(id) {
    try {
      const doc = await this.db.collection('donations').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Donation');
      }

      return {
        success: true,
        donation: {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate()
        }
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch donation: ' + error.message);
    }
  }

  async getDonationStats({ startDate, endDate, type }) {
    try {
      let query = this.db.collection('donations');

      if (startDate) {
        query = query.where('createdAt', '>=', new Date(startDate));
      }

      if (endDate) {
        query = query.where('createdAt', '<=', new Date(endDate));
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();

      let totalAmount = 0;
      let totalDonations = snapshot.size;
      const byPaymentMethod = {
        creditCard: { count: 0, amount: 0 },
        paypal: { count: 0, amount: 0 },
        tmoney: { count: 0, amount: 0 },
        flooz: { count: 0, amount: 0 }
      };
      const byType = {
        oneTime: { count: 0, amount: 0 },
        monthly: { count: 0, amount: 0 }
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        const amount = data.amount || 0;
        
        totalAmount += amount;

        if (byPaymentMethod[data.paymentMethod]) {
          byPaymentMethod[data.paymentMethod].count++;
          byPaymentMethod[data.paymentMethod].amount += amount;
        }

        if (byType[data.type]) {
          byType[data.type].count++;
          byType[data.type].amount += amount;
        }
      });

      return {
        success: true,
        stats: {
          totalDonations,
          totalAmount,
          averageDonation: totalDonations > 0 ? totalAmount / totalDonations : 0,
          byPaymentMethod,
          byType
        }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch donation stats: ' + error.message);
    }
  }

  async getTopDonors({ limit = 10, startDate, endDate }) {
    try {
      let query = this.db.collection('donations');

      if (startDate) {
        query = query.where('createdAt', '>=', new Date(startDate));
      }

      if (endDate) {
        query = query.where('createdAt', '<=', new Date(endDate));
      }

      const snapshot = await query.get();

      const donorMap = new Map();

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.isAnonymous) return;

        const userId = data.userId;
        const userName = data.userName;
        const amount = data.amount || 0;

        if (donorMap.has(userId)) {
          const donor = donorMap.get(userId);
          donor.totalAmount += amount;
          donor.donationCount++;
        } else {
          donorMap.set(userId, {
            userId,
            userName,
            totalAmount: amount,
            donationCount: 1
          });
        }
      });

      const topDonors = Array.from(donorMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);

      return {
        success: true,
        topDonors
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch top donors: ' + error.message);
    }
  }

  async deleteDonation(id) {
    try {
      const doc = await this.db.collection('donations').doc(id).get();

      if (!doc.exists) {
        throw new NotFoundError('Donation');
      }

      await this.db.collection('donations').doc(id).delete();

      return {
        success: true,
        message: 'Donation deleted successfully'
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw new DatabaseError('Failed to delete donation: ' + error.message);
    }
  }
}

module.exports = DonationService;