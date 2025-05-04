const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const path = require('path');
const tough = require('tough-cookie');

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
 * Load cookies from a JSON file directly without transforming
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
 * Fetch the newest post of an Instagram user using Instagram Private API
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result of the operation
 */
const fetchNewestPostWithToughApi = async (options) => {
    const {
        username,
        cookiesPath,
        logFilePath = path.join(__dirname, '../../logs/activity_log.txt')
    } = options;

    // Create logs directory if it doesn't exist
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Initialize log file with header if it doesn't exist
    const timestamp = new Date().toISOString();
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, `=== Instagram Post Fetching Session Started at ${timestamp} ===\n`);
    } else {
        fs.appendFileSync(logFilePath, `\n=== Instagram Post Fetching Session Started at ${timestamp} ===\n`);
    }

    let result = {
        success: false,
        message: '',
        post: null
    };

    try {
        // Initialize Instagram API client
        const ig = new IgApiClient();

        // Generate a random device ID for the user
        ig.state.generateDevice(username);

        // Log attempt
        logActivity(logFilePath, username, 'Attempting to fetch newest post with Private API');

        // Load cookies directly, exactly like in fetch_newest_post.js
        try {
            // Load cookies
            const cookies = loadCookies(cookiesPath);

            // Apply cookies directly to the Instagram client
            await ig.state.deserializeCookieJar(JSON.stringify(cookies));

            logActivity(logFilePath, username, 'Successfully loaded cookies');
        } catch (cookieError) {
            logActivity(logFilePath, username, `Cookie error: ${cookieError.message}`);
            throw new Error(`Failed to apply cookies: ${cookieError.message}`);
        }

        // Search for the target user
        const searchResult = await ig.user.searchExact(username);
        if (!searchResult) {
            const message = `User ${username} not found`;
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // Get user PK (ID)
        const userPk = searchResult.pk;

        // Fetch the user's feed
        const userFeed = ig.feed.user(userPk);
        const posts = await userFeed.items();

        if (!posts || posts.length === 0) {
            const message = 'No posts available for this user';
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // Filter out pinned posts and include all types of content
        const nonPinnedContent = posts.filter(post => !post.is_pinned);

        // Sort the posts by date (newest first)
        const sortedContent = nonPinnedContent.sort((a, b) => b.taken_at - a.taken_at);

        // Get the latest post
        const latestPost = sortedContent[0];

        if (!latestPost) {
            const message = 'No content found after filtering';
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // Extract information from the post
        const postDate = new Date(latestPost.taken_at * 1000);
        const isReel = latestPost.media_type === 2;
        const caption = latestPost.caption ? latestPost.caption.text : '';
        const postUrl = `https://www.instagram.com/p/${latestPost.code}/`;

        // Get media URL
        let mediaUrl = '';
        if (isReel && latestPost.video_versions && latestPost.video_versions.length > 0) {
            mediaUrl = latestPost.video_versions[0].url;
        } else if (latestPost.image_versions2 && latestPost.image_versions2.candidates && latestPost.image_versions2.candidates.length > 0) {
            mediaUrl = latestPost.image_versions2.candidates[0].url;
        }

        // Create post info object
        const postInfo = {
            postUrl,
            postCode: latestPost.code,
            caption,
            type: isReel ? 'video' : 'image',
            mediaUrl,
            timestamp: postDate.toISOString(),
            postId: latestPost.id
        };

        // Log success
        logActivity(logFilePath, username, `Successfully fetched newest post: ${postInfo.postCode}`);

        result.success = true;
        result.message = `Successfully fetched newest post for ${username}`;
        result.post = postInfo;

        return result;
    } catch (error) {
        logActivity(logFilePath, username, `Error fetching post via API: ${error.message}`);
        result.message = `Error: ${error.message}`;
        return result;
    }
};

module.exports = {
    fetchNewestPostWithToughApi,
    loadCookies,
    logActivity
};
