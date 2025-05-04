const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Load cookies from a JSON file
 * @param {string} cookiesPath - Path to the cookies JSON file
 * @returns {Array} Array of cookie objects
 */
const loadCookies = (cookiesPath) => {
    try {
        const cookiesString = fs.readFileSync(cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);
        console.log(`Loaded ${cookies.length} cookies from ${cookiesPath}`);
        return cookies;
    } catch (error) {
        console.error(`Error loading cookies from ${cookiesPath}:`, error);
        throw new Error(`Failed to load cookies: ${error.message}`);
    }
};

/**
 * Log activity to file and console
 * @param {string} logFilePath - Path to the log file
 * @param {string} username - Instagram username
 * @param {string} action - Action performed
 */
const logActivity = (logFilePath, username, action) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${username} - ${action}\n`;

    console.log(`${username} - ${action}`);
    fs.appendFileSync(logFilePath, logEntry);
};

/**
 * Fetch the newest post of an Instagram user using external fetch_newest_post.js
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result of the operation
 */
const fetchNewestPostApi = async (options) => {
    const {
        username,
        cookiesPath,
        logFilePath = path.join(__dirname, '../../logs/activity_log.txt')
    } = options;

    // Ensure cookies file is in the expected location
    const targetCookiePath = path.join(path.dirname(__dirname), '../igcookie.json');
    if (cookiesPath !== targetCookiePath) {
        fs.copyFileSync(cookiesPath, targetCookiePath);
    }

    return new Promise((resolve) => {
        const scriptPath = path.join(path.dirname(__dirname), '../fetch_newest_post.js');
        const proc = spawn('node', [scriptPath, username], { stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            let result = {};
            try {
                result = JSON.parse(stdout.trim());
            } catch (e) {
                result = { error: 'Failed to parse fetch_newest_post.js output', details: stdout.trim(), stderr };
            }
            if (result.error) {
                resolve({
                    success: false,
                    message: result.error,
                    username
                });
            } else {
                resolve({
                    success: true,
                    message: `Successfully fetched newest post for ${username}`,
                    username,
                    post: {
                        postUrl: result.post_url,
                        caption: result.caption,
                        mediaUrl: result.media_url
                    }
                });
            }
        });
    });
};

module.exports = {
    fetchNewestPostApi,
    loadCookies,
    logActivity
};
