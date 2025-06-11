const express = require('express');
const instagramController = require('../controllers/instagram.controller');

const router = express.Router();

/**
 * @route POST /api/instagram/like-story
 * @desc Like a story for a specific Instagram username
 * @access Public
 * @param {string} username - Instagram username
 * @param {file} cookie - Instagram cookie.json file
 * @param {string} [browserless] - Whether to use browserless.com (true/false)
 * @param {string} [browserlessToken] - Browserless.com API token
 * @param {string} [headless] - Whether to run browser in headless mode (true/false)
 * @param {string} [emojis] - JSON array of emoji strings to use
 * @returns {Object} Response object with success status and message
 */
router.post('/like-story', instagramController.likeUserStory);

/**
 * @route POST /api/instagram/newest-post
 * @desc Fetch the newest post from a specific Instagram username
 * @access Public
 * @param {string} username - Instagram username
 * @param {file} cookie - Instagram cookie.json file
 * @param {string} [browserless] - Whether to use browserless.com (true/false)
 * @param {string} [browserlessToken] - Browserless.com API token
 * @param {string} [headless] - Whether to run browser in headless mode (true/false)
 * @returns {Object} Response object with success status, message, and post details
 */
router.post('/newest-post', instagramController.fetchNewestPost);

/**
 * @route POST /api/instagram/like-post
 * @desc Like a specific Instagram post using Puppeteer
 * @access Public
 * @param {string} postUrl - URL of the Instagram post to like
 * @param {file} cookie - Instagram cookie.json file
 * @param {string} [headless] - Whether to run browser in headless mode (true/false)
 * @returns {Object} Response object with success status and message
 */
router.post('/like-post', instagramController.likePuppeteerPost);

/**
 * @route POST /api/instagram/post-comment
 * @desc Post a comment on an Instagram post
 * @access Public
 * @param {string} postUrl - URL of the Instagram post to comment on
 * @param {string} comment - Text of the comment to post
 * @param {string} [postId] - Optional ID of the post for comment logging to prevent duplicate comments
 * @param {file} cookie - Instagram cookie.json file
 * @param {string} [headless] - Whether to run browser in headless mode (true/false)
 * @returns {Object} Response object with success status and message
 */
router.post('/post-comment', instagramController.postComment);

/**
 * @route POST /api/instagram/similar-accounts
 * @desc Get similar accounts for a username using job queue
 * @access Public
 * @param {string} targetUsername - Instagram username to find similar accounts for
 * @param {file} cookieFile - Instagram cookie.json file
 * @param {string} [browserless] - JSON string with browserless configuration
 * @param {string} [browserOptions] - JSON string with browser options
 * @returns {Object} Response object with jobId and status
 */
router.post('/similar-accounts', instagramController.uploadMemory.single('cookieFile'), instagramController.getSimilarAccounts);

/**
 * @route POST /api/instagram/follow
 * @desc Follow a user using job queue
 * @access Public
 * @param {string} targetUsername - Instagram username to follow
 * @param {file} cookieFile - Instagram cookie.json file
 * @param {string} [browserless] - JSON string with browserless configuration
 * @param {string} [browserOptions] - JSON string with browser options
 * @returns {Object} Response object with jobId and status
 */
router.post('/follow', instagramController.uploadMemory.single('cookieFile'), instagramController.followUser);

module.exports = router;
