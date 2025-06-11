const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// GET user data by username
router.get('/:username', userController.getUserData);

module.exports = router;