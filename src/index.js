require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { swaggerSpec, swaggerUi } = require('./swagger');

const appConfig = require('./config/app');
const serviceContainer = require('./config/serviceContainer');
const {
  errorHandler,
  notFoundHandler,
  handleUncaughtExceptions,
  handleUnhandledRejections,
  handleTerminationSignals
} = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const audioRoutes = require('./routes/audio');
const sermonRoutes = require('./routes/sermon');
const eventRoutes = require('./routes/event');
const postRoutes = require('./routes/post');
const statsRoutes = require('./routes/stats');
const liveRoutes = require('./routes/live');
const DonationRoutes = require('./routes/donation');

handleUncaughtExceptions();

async function startServer() {
  try {
    console.log('🚀 Starting Voice Of Faith API Server...\n');

    await serviceContainer.initialize();

    const app = express();

    app.use(express.static(__dirname + '/public'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.use(helmet());
    app.use(cors(appConfig.getCorsConfig()));
    
    // Logging
    if (appConfig.isDevelopment()) {
      app.use(morgan('dev'));
    } else {
      app.use(morgan('combined'));
    }
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
      req.container = serviceContainer;
      next();
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        status: 'healthy',
        environment: appConfig.env,
        timestamp: new Date().toISOString(),
        services: {
          firebase: serviceContainer.has('db'),
          email: serviceContainer.has('emailTransporter')
        }
      });
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/admin/users', userRoutes);
    app.use('/api/audios', audioRoutes);
    app.use('/api/sermons', sermonRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/admin/stats', statsRoutes);
    app.use('/api/admin/live', liveRoutes);
    app.use('/api/admin/donations', DonationRoutes);

    // Route 404
    app.use(notFoundHandler);

    // Error handler global
    app.use(errorHandler);

    const PORT = appConfig.getPort();
    const server = app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
    });

    handleUnhandledRejections(server);
    handleTerminationSignals(server);

    return { app, server };

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;