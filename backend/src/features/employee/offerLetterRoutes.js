const express = require('express');
const router = express.Router();
const offerLetterController = require('./offerLetterController');
const { verifyToken } = require('../../middleware/auth.middleware');
const requireModuleAccess = require('../../middleware/requireModuleAccess');

const canReadOfferLetters = requireModuleAccess('offer_letters', 'read');
const canWriteOfferLetters = requireModuleAccess('offer_letters', 'write');

// HR: save or update letter
router.post('/', verifyToken, canWriteOfferLetters, offerLetterController.saveOfferLetter);

// Employee: get my letter
router.get('/my', verifyToken, offerLetterController.getMyOfferLetters);

// HR: get all letters for tracking
router.get('/all', verifyToken, canReadOfferLetters, offerLetterController.getAllOfferLetters);

// HR: update letter status, and create employee when accepted
router.put('/:id/status', verifyToken, canWriteOfferLetters, offerLetterController.updateOfferStatus);

module.exports = router;
