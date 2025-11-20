const admin = require('firebase-admin');

class StatsService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Statistiques globales
   */
  async getOverviewStats() {
    try {
      // Compter les utilisateurs par rôle
      const usersSnapshot = await this.db.collection('users').get();
      const usersByRole = {
        user: 0,
        pasteur: 0,
        media: 0,
        admin: 0,
        total: usersSnapshot.size
      };

      usersSnapshot.forEach(doc => {
        const role = doc.data().role;
        if (usersByRole[role] !== undefined) {
          usersByRole[role]++;
        }
      });

      // Compter les contenus
      const audiosCount = (await this.db.collection('audios').count().get()).data().count;
      const sermonsCount = (await this.db.collection('sermons').count().get()).data().count;
      const eventsCount = (await this.db.collection('events').count().get()).data().count;
      const postsCount = (await this.db.collection('posts').count().get()).data().count;

      // Calculer totaux plays/downloads
      const audiosSnapshot = await this.db.collection('audios').get();
      let totalPlays = 0;
      let totalDownloads = 0;
      audiosSnapshot.forEach(doc => {
        totalPlays += doc.data().plays || 0;
        totalDownloads += doc.data().downloads || 0;
      });

      // Statistiques des 30 derniers jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUsers = await this.db.collection('users')
        .where('createdAt', '>=', thirtyDaysAgo)
        .count()
        .get();

      const recentAudios = await this.db.collection('audios')
        .where('createdAt', '>=', thirtyDaysAgo)
        .count()
        .get();

      return {
        success: true,
        stats: {
          users: usersByRole,
          content: {
            audios: audiosCount,
            sermons: sermonsCount,
            events: eventsCount,
            posts: postsCount
          },
          engagement: {
            totalPlays,
            totalDownloads,
            avgPlaysPerAudio: audiosCount > 0 ? Math.round(totalPlays / audiosCount) : 0
          },
          growth: {
            newUsersLast30Days: recentUsers.data().count,
            newAudiosLast30Days: recentAudios.data().count
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Statistiques des audios
   */
  async getAudioStats(period) {
    try {
      const periodDate = new Date();
      periodDate.setDate(periodDate.getDate() - period);

      const snapshot = await this.db.collection('audios')
        .where('createdAt', '>=', periodDate)
        .get();

      const stats = {
        total: snapshot.size,
        byCategory: {
          emission: 0,
          podcast: 0,
          teaching: 0
        },
        topAudios: [],
        totalPlays: 0,
        totalDownloads: 0
      };

      const audios = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        stats.byCategory[data.category]++;
        stats.totalPlays += data.plays || 0;
        stats.totalDownloads += data.downloads || 0;
        
        audios.push({
          id: doc.id,
          title: data.title,
          plays: data.plays || 0,
          downloads: data.downloads || 0
        });
      });

      // Top 10 audios par lectures
      stats.topAudios = audios
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 10);

      return {
        success: true,
        period: `${period} days`,
        stats
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Statistiques des utilisateurs
   */
  async getUserStats() {
    try {
      const snapshot = await this.db.collection('users').get();

      const stats = {
        total: snapshot.size,
        byRole: {
          user: 0,
          pasteur: 0,
          media: 0,
          admin: 0
        },
        registrationsByMonth: {}
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Compter par rôle
        if (stats.byRole[data.role] !== undefined) {
          stats.byRole[data.role]++;
        }

        // Compter par mois
        const date = data.createdAt.toDate();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        stats.registrationsByMonth[monthKey] = (stats.registrationsByMonth[monthKey] || 0) + 1;
      });

      return {
        success: true,
        stats
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Statistiques d'engagement
   */
  async getEngagementStats() {
    try {
      // Posts stats
      const postsSnapshot = await this.db.collection('posts').get();
      let totalPostViews = 0;
      let totalPostLikes = 0;

      postsSnapshot.forEach(doc => {
        const data = doc.data();
        totalPostViews += data.views || 0;
        totalPostLikes += data.likes || 0;
      });

      // Sermons stats
      const sermonsSnapshot = await this.db.collection('sermons').get();
      let totalSermonDownloads = 0;

      sermonsSnapshot.forEach(doc => {
        totalSermonDownloads += doc.data().downloads || 0;
      });

      return {
        success: true,
        stats: {
          posts: {
            total: postsSnapshot.size,
            totalViews: totalPostViews,
            totalLikes: totalPostLikes,
            avgViewsPerPost: postsSnapshot.size > 0 
              ? Math.round(totalPostViews / postsSnapshot.size) 
              : 0
          },
          sermons: {
            total: sermonsSnapshot.size,
            totalDownloads: totalSermonDownloads,
            avgDownloadsPerSermon: sermonsSnapshot.size > 0 
              ? Math.round(totalSermonDownloads / sermonsSnapshot.size) 
              : 0
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new StatsService();