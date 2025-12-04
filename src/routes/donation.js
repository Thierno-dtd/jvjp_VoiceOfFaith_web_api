const express = require('express');
const router = express.Router();
const { verifyFirebaseToken, verifyAdminToken } = require('../middleware/auth');
const DonationController = require('../controllers/donation');
const donationValidators = require('../validators/donation');

/**
 * @swagger
 * tags:
 *   name: Donations
 *   description: Gestion des donations
 */

/**
 * @swagger
 * /api/admin/donations/stats:
 *   get:
 *     summary: Récupérer les statistiques des donations (Admin)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [oneTime, monthly]
 *     responses:
 *       200:
 *         description: Statistiques des donations
 */
router.get(
  '/stats',
  verifyAdminToken,
  donationValidators.getStats,
  DonationController.getStats
);

/**
 * @swagger
 * /api/admin/donations/top-donors:
 *   get:
 *     summary: Récupérer le top des donateurs (Admin)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Top des donateurs
 */
router.get(
  '/top-donors',
  verifyAdminToken,
  donationValidators.getTopDonors,
  DonationController.getTopDonors
);

/**
 * @swagger
 * /api/donations:
 *   post:
 *     summary: Créer une nouvelle donation
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 50.00
 *               type:
 *                 type: string
 *                 enum: [oneTime, monthly]
 *                 example: "oneTime"
 *               paymentMethod:
 *                 type: string
 *                 enum: [creditCard, paypal, tmoney, flooz]
 *                 example: "tmoney"
 *               message:
 *                 type: string
 *                 example: "Pour le soutien de l'église"
 *               isAnonymous:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Donation créée avec succès
 *       400:
 *         description: Erreur de validation
 *       401:
 *         description: Non authentifié
 */
router.post(
  '/',
  verifyFirebaseToken,
  donationValidators.create,
  DonationController.create
);

/**
 * @swagger
 * /api/admin/donations:
 *   get:
 *     summary: Récupérer toutes les donations (Admin)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [oneTime, monthly]
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [creditCard, paypal, tmoney, flooz]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des donations
 */
router.get(
  '/',
  verifyAdminToken,
  donationValidators.getAll,
  DonationController.getAll
);

/**
 * @swagger
 * /api/admin/donations/{id}:
 *   get:
 *     summary: Récupérer une donation par ID (Admin)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Donation trouvée
 *       404:
 *         description: Donation non trouvée
 */
router.get(
  '/:id',
  verifyAdminToken,
  donationValidators.getById,
  DonationController.getById
);

/**
 * @swagger
 * /api/admin/donations/{id}:
 *   delete:
 *     summary: Supprimer une donation (Admin)
 *     tags: [Donations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Donation supprimée
 *       404:
 *         description: Donation non trouvée
 */
router.delete(
  '/:id',
  verifyAdminToken,
  donationValidators.delete,
  DonationController.delete
);

module.exports = router;