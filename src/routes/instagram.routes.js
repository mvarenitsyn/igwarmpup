const express = require('express');
const instagramController = require('../controllers/instagram.controller');
const BrowserlessManager = require('../utils/browserless.manager');

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

/**
 * @route POST /api/instagram/send-message
 * @desc Send message to a user using job queue
 * @access Public
 * @param {string} targetUsername - Instagram username to send message to
 * @param {string} message - Message content to send
 * @param {file} cookieFile - Instagram cookie.json file
 * @param {string} [browserless] - JSON string with browserless configuration
 * @param {string} [browserOptions] - JSON string with browser options
 * @returns {Object} Response object with jobId and status
 */
router.post('/send-message', instagramController.uploadMemory.single('cookieFile'), instagramController.sendMessage);

/**
 * @route POST /api/instagram/browserless/reset
 * @desc Reset and cleanup browserless sessions
 * @access Public
 * @param {string} browserlessToken - Browserless.io API token
 * @returns {Object} Response object with reset status and details
 */
router.post('/browserless/reset', async (req, res) => {
    try {
        const { browserlessToken } = req.body;
        
        if (!browserlessToken) {
            return res.status(400).json({
                success: false,
                message: 'Browserless token is required'
            });
        }

        const manager = new BrowserlessManager(browserlessToken);
        const result = await manager.resetAndCleanup();

        return res.status(200).json({
            success: true,
            message: 'Browserless reset completed',
            details: result
        });
    } catch (error) {
        console.error('Error resetting browserless:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset browserless',
            error: error.message
        });
    }
});

/**
 * @route GET /api/instagram/browserless/status
 * @desc Get browserless service status
 * @access Public
 * @param {string} browserlessToken - Browserless.io API token (query param)
 * @returns {Object} Response object with service status
 */
router.get('/browserless/status', async (req, res) => {
    try {
        const { browserlessToken } = req.query;
        
        if (!browserlessToken) {
            return res.status(400).json({
                success: false,
                message: 'Browserless token is required'
            });
        }

        const manager = new BrowserlessManager(browserlessToken);
        const [health, stats, sessions] = await Promise.all([
            manager.getHealthCheck(),
            manager.getStats(),
            manager.getSessions()
        ]);

        const isRateLimited = await manager.isRateLimited();

        return res.status(200).json({
            success: true,
            status: {
                health: health.success ? 'healthy' : 'unhealthy',
                rateLimited: isRateLimited,
                stats: stats.data,
                activeSessions: sessions.success ? sessions.data.length : 'unknown',
                details: {
                    health,
                    stats,
                    sessions
                }
            }
        });
    } catch (error) {
        console.error('Error checking browserless status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check browserless status',
            error: error.message
        });
    }
});

module.exports = router;
