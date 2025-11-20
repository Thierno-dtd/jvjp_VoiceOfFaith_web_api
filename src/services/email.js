const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Envoyer un email d'invitation pour pasteur/media
 */
async function sendInvitationEmail({ email, displayName, inviteToken, role }) {
  const appDeepLink = `churchapp://reset-password?token=${inviteToken}`;
  const webFallbackLink = `https://yourdomain.com/reset-password?token=${inviteToken}`;

  const roleDisplay = role === 'pasteur' ? 'Pasteur' : 'Équipe Média';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f6fa;
        }
        .header {
          background-color: #2E4FE8;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background-color: #FFC107;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏛️ Bienvenue dans l'équipe !</h1>
        </div>
        <div class="content">
          <h2>Bonjour ${displayName},</h2>
          
          <p>Vous avez été invité(e) à rejoindre notre plateforme Church Management en tant que <strong>${roleDisplay}</strong>.</p>
          
          <p>Pour activer votre compte et définir votre mot de passe, veuillez :</p>
          
          <ol>
            <li>Télécharger l'application mobile Church App</li>
            <li>Cliquer sur le bouton ci-dessous ou copier le lien</li>
            <li>Définir votre mot de passe</li>
            <li>Compléter votre profil</li>
          </ol>
          
          <center>
            <a href="${appDeepLink}" class="button">Activer mon compte</a>
          </center>
          
          <p style="margin-top: 20px; padding: 15px; background-color: #f5f6fa; border-radius: 8px;">
            <strong>Lien direct :</strong><br>
            <code style="color: #2E4FE8; word-break: break-all;">${appDeepLink}</code>
          </p>
          
          <p><strong>Note :</strong> Si le lien ne fonctionne pas, copiez-le et ouvrez-le depuis l'application mobile.</p>
          
          <p>Ce lien est valide pendant 7 jours.</p>
          
          <p>Si vous n'avez pas demandé cette invitation, veuillez ignorer cet email.</p>
          
          <p style="margin-top: 30px;">
            Cordialement,<br>
            <strong>L'équipe Church Management</strong>
          </p>
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement, merci de ne pas répondre.</p>
          <p>&copy; ${new Date().getFullYear()} Church Management System. Tous droits réservés.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Bonjour ${displayName},
    
    Vous avez été invité(e) à rejoindre notre plateforme Church Management en tant que ${roleDisplay}.
    
    Pour activer votre compte :
    1. Téléchargez l'application mobile Church App
    2. Utilisez ce lien : ${appDeepLink}
    3. Définissez votre mot de passe
    4. Complétez votre profil
    
    Ce lien est valide pendant 7 jours.
    
    Cordialement,
    L'équipe Church Management
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Famille JVJP" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitation - ${roleDisplay} sur voice of faith`,
      text: textContent,
      html: htmlContent
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send invitation email');
  }
}

/**
 * Envoyer un email de bienvenue après inscription
 */
async function sendWelcomeEmail({ email, displayName }) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2E4FE8;">Bienvenue ${displayName} !</h2>
        <p>Merci d'avoir rejoint notre communauté Church App.</p>
        <p>Nous sommes ravis de vous compter parmi nous.</p>
        <p>N'hésitez pas à explorer l'application et à profiter de tous nos contenus.</p>
        <p>Que Dieu vous bénisse !</p>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Church App" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Bienvenue sur Voice of faith ! 🙏',
      html: htmlContent
    });
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

module.exports = {
  sendInvitationEmail,
  sendWelcomeEmail
};