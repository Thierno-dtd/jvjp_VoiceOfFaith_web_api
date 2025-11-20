const admin = require('firebase-admin');

/**
 * Générer un rapport mensuel (exemple simplifié)
 * En production, utilisez une bibliothèque comme pdfkit ou puppeteer
 */
async function generateMonthlyReport(year, month) {
  try {
    const db = admin.firestore();
    
    // Période du rapport
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Collecter les statistiques
    const stats = {
      period: `${year}-${String(month).padStart(2, '0')}`,
      users: await getUserStats(db, startDate, endDate),
      audios: await getAudioStats(db, startDate, endDate),
      sermons: await getSermonStats(db, startDate, endDate),
      events: await getEventStats(db, startDate, endDate),
      posts: await getPostStats(db, startDate, endDate)
    };

    // En production: Générer un PDF avec ces données
    // Pour l'instant, retourner les données JSON
    
    return {
      success: true,
      reportData: stats,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error('Failed to generate report');
  }
}

async function getUserStats(db, startDate, endDate) {
  const snapshot = await db.collection('users')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();

  return {
    newUsers: snapshot.size,
    byRole: countByField(snapshot, 'role')
  };
}

async function getAudioStats(db, startDate, endDate) {
  const snapshot = await db.collection('audios')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();

  let totalPlays = 0;
  let totalDownloads = 0;

  snapshot.forEach(doc => {
    totalPlays += doc.data().plays || 0;
    totalDownloads += doc.data().downloads || 0;
  });

  return {
    newAudios: snapshot.size,
    totalPlays,
    totalDownloads,
    byCategory: countByField(snapshot, 'category')
  };
}

async function getSermonStats(db, startDate, endDate) {
  const snapshot = await db.collection('sermons')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();

  let totalDownloads = 0;
  snapshot.forEach(doc => {
    totalDownloads += doc.data().downloads || 0;
  });

  return {
    newSermons: snapshot.size,
    totalDownloads
  };
}

async function getEventStats(db, startDate, endDate) {
  const snapshot = await db.collection('events')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();

  return {
    newEvents: snapshot.size
  };
}

async function getPostStats(db, startDate, endDate) {
  const snapshot = await db.collection('posts')
    .where('createdAt', '>=', startDate)
    .where('createdAt', '<=', endDate)
    .get();

  let totalViews = 0;
  let totalLikes = 0;

  snapshot.forEach(doc => {
    totalViews += doc.data().views || 0;
    totalLikes += doc.data().likes || 0;
  });

  return {
    newPosts: snapshot.size,
    totalViews,
    totalLikes,
    byCategory: countByField(snapshot, 'category')
  };
}

function countByField(snapshot, field) {
  const counts = {};
  snapshot.forEach(doc => {
    const value = doc.data()[field];
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

module.exports = {
  generateMonthlyReport
};