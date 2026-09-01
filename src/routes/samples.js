const express = require('express');
const router = express.Router();
const sampleController = require('../controllers/sampleController');

// All sample routes
router.get('/', sampleController.getSamples);
router.post('/', sampleController.issueSample);
router.put('/:id/return', sampleController.returnSample);
router.put('/:id/complete', sampleController.completeSample);

module.exports = router;
