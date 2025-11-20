const nodemailer = require('nodemailer');

class EmailConfig {
  constructor() {
    this.transporter = null;
  }

  /**
   * Initialiser le transporteur email
   */
  initialize() {
    try {
      // Validation des variables d'environnement
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP credentials not configured in environment variables');
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true pour 465, false pour les autres ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Pour développement uniquement
        }
      });

      // Vérifier la connexion
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ SMTP connection error:', error);
        } else {
          console.log('✅ SMTP server ready to send emails');
        }
      });

      return this;
    } catch (error) {
      console.error('❌ Email configuration error:', error);
      throw new Error('Failed to configure email transporter');
    }
  }

  getTransporter() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized. Call initialize() first.');
    }
    return this.transporter;
  }

  getSenderEmail() {
    return process.env.SMTP_USER;
  }


  getAppName() {
    return process.env.APP_NAME || 'Voice Of Faith';
  }
}

module.exports = new EmailConfig();