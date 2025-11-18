const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../middleware/auth.middleware');

/**
 * GET /api/admin/stats/overview
 * Statistiques globales du dashboard
 */
router.get('/overview', verifyAdminToken, async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Compter les utilisateurs par rôle
    const usersSnapshot = await db.collection('users').get();
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
    const audiosCount = (await db.collection('audios').count().get()).data().count;
    const sermonsCount = (await db.collection('sermons').count().get()).data().count;
    const eventsCount = (await db.collection('events').count().get()).data().count;
    const postsCount = (await db.collection('posts').count().get()).data().count;

    // Calculer totaux plays/downloads
    const audiosSnapshot = await db.collection('audios').get();
    let totalPlays = 0;
    let totalDownloads = 0;
    audiosSnapshot.forEach(doc => {
      totalPlays += doc.data().plays || 0;
      totalDownloads += doc.data().downloads || 0;
    });

    // Statistiques des 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await db.collection('users')
      .where('createdAt', '>=', thirtyDaysAgo)
      .count()
      .get();

    const recentAudios = await db.collection('audios')
      .where('createdAt', '>=', thirtyDaysAgo)
      .count()
      .get();

    res.json({
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
    });

  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/stats/audios
 * Statistiques détaillées des audios
 */
router.get('/audios', verifyAdminToken, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { period = '30' } = req.query; // jours

    const periodDate = new Date();
    periodDate.setDate(periodDate.getDate() - parseInt(period));

    const snapshot = await db.collection('audios')
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

    res.json({
      success: true,
      period: `${period} days`,
      stats
    });

  } catch (error) {
    console.error('Error fetching audio stats:', error);
    res.status(500).json({ error: 'Failed to fetch audio stats' });
  }
});

/**
 * GET /api/admin/stats/users
 * Statistiques des utilisateurs
 */
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const db = req.app.locals.db;

    const snapshot = await db.collection('users').get();

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

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

/**
 * GET /api/admin/stats/engagement
 * Statistiques d'engagement
 */
router.get('/engagement', verifyAdminToken, async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Posts stats
    const postsSnapshot = await db.collection('posts').get();
    let totalPostViews = 0;
    let totalPostLikes = 0;

    postsSnapshot.forEach(doc => {
      const data = doc.data();
      totalPostViews += data.views || 0;
      totalPostLikes += data.likes || 0;
    });

    // Sermons stats
    const sermonsSnapshot = await db.collection('sermons').get();
    let totalSermonDownloads = 0;

    sermonsSnapshot.forEach(doc => {
      totalSermonDownloads += doc.data().downloads || 0;
    });

    res.json({
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
    });

  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    res.status(500).json({ error: 'Failed to fetch engagement stats' });
  }
});

module.exports = router;