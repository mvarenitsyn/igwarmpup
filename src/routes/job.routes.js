const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');

// GET jobs by username (must come before generic /:jobId route)
router.get('/user/:username', jobController.getUserJobs);

// GET job status by ID
router.get('/:jobId', jobController.getJobStatus);

module.exports = router;