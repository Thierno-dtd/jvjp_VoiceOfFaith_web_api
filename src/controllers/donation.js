const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { asyncHandler } = require('../middleware/errorHandler');

class DonationController {
  create = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const donationService = req.container.get('donationService');
    const result = await donationService.createDonation(req.body, req.user);

    res.status(201).json(result);
  });

  getAll = asyncHandler(async (req, res) => {
    const { limit = 100, page = 1, type, paymentMethod, userId } = req.query;

    const donationService = req.container.get('donationService');
    const result = await donationService.getAllDonations({
      limit: parseInt(limit),
      page: parseInt(page),
      type,
      paymentMethod,
      userId
    });

    res.json(result);
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const donationService = req.container.get('donationService');
    const result = await donationService.getDonationById(id);

    res.json(result);
  });

  getStats = asyncHandler(async (req, res) => {
    const { startDate, endDate, type } = req.query;

    const donationService = req.container.get('donationService');
    const result = await donationService.getDonationStats({
      startDate,
      endDate,
      type
    });

    res.json(result);
  });

  getTopDonors = asyncHandler(async (req, res) => {
    const { limit = 10, startDate, endDate } = req.query;

    const donationService = req.container.get('donationService');
    const result = await donationService.getTopDonors({
      limit: parseInt(limit),
      startDate,
      endDate
    });

    res.json(result);
  });

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const donationService = req.container.get('donationService');
    const result = await donationService.deleteDonation(id);

    res.json(result);
  });
}

module.exports = new DonationController();