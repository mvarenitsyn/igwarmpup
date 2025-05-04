const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
 * Fetch the newest post of an Instagram user using a puppeteer browser approach
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result of the operation
 */
const fetchNewestPostWithBrowser = async (options) => {
    const {
        username,
        cookiesPath,
        logFilePath = path.join(__dirname, '../../logs/activity_log.txt'),
        headless = true,
        browserless = { enabled: false }
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

    let browser;
    let page;

    try {
        // Log attempt
        logActivity(logFilePath, username, 'Attempting to fetch newest post with browser');

        // Launch browser (either local or browserless)
        if (browserless.enabled && browserless.endpoint) {
            logActivity(logFilePath, username, 'Connecting to browserless.io');
            browser = await puppeteer.connect({
                browserWSEndpoint: browserless.endpoint,
                defaultViewport: null,
                ...(browserless.options || {})
            });
        } else {
            logActivity(logFilePath, username, 'Launching local browser');
            browser = await puppeteer.launch({
                headless: headless ? "new" : false,
                defaultViewport: null,
                args: ['--start-maximized']
            });
        }

        page = await browser.newPage();

        // Load cookies
        if (!fs.existsSync(cookiesPath)) {
            throw new Error(`Cookie file not found: ${cookiesPath}`);
        }

        const cookiesString = fs.readFileSync(cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);
        logActivity(logFilePath, username, `Loaded ${cookies.length} cookies from ${cookiesPath}`);

        await page.setCookie(...cookies);

        // Navigate to Instagram
        logActivity(logFilePath, username, 'Navigating to Instagram');
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

        // Check if logged in
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('input[name="username"]');
        });

        if (!isLoggedIn) {
            throw new Error('Not logged in. Please check cookies.');
        }

        logActivity(logFilePath, username, 'Successfully logged in to Instagram');

        // Navigate to user's profile
        logActivity(logFilePath, username, `Navigating to ${username}'s profile`);
        await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'networkidle2' });

        // Check if the profile exists
        const profileExists = await page.evaluate(() => {
            const bodyText = document.body.innerText.toLowerCase();
            return !bodyText.includes("sorry, this page isn't available") &&
                !bodyText.includes("page not found") &&
                !bodyText.includes("the link you followed may be broken");
        });

        if (!profileExists) {
            const message = `Profile not found for ${username}`;
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // Wait for posts to load - add a delay to ensure everything is loaded
        await page.waitForSelector('article, a[href*="/p/"]', { timeout: 10000 }).catch(() => { });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if the user has posts
        const hasPosts = await page.evaluate(() => {
            return !!document.querySelector('article') || !!document.querySelector('a[href*="/p/"]');
        });

        if (!hasPosts) {
            const message = 'No posts available for this user';
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // Extract information about the most recent post
        const postInfo = await page.evaluate(() => {
            // Find the first post link
            const postLinks = document.querySelectorAll('a[href*="/p/"]');
            if (!postLinks || postLinks.length === 0) return null;

            // Get the first link (most recent post)
            const postLink = postLinks[0];
            const postUrl = postLink.href;

            // Extract post code from URL
            const urlParts = postUrl.split('/');
            const postCode = urlParts.find(part => part.includes('p/')) ?
                urlParts[urlParts.indexOf('p/') + 1] :
                urlParts.filter(Boolean).pop();

            // Get image or video if available
            let mediaUrl = '';
            let type = 'image';

            const img = postLink.querySelector('img');
            if (img && img.src) {
                mediaUrl = img.src;
            }

            const video = postLink.querySelector('video');
            if (video && video.src) {
                mediaUrl = video.src;
                type = 'video';
            }

            // Try to find caption (may not be available on profile page)
            let caption = '';
            const captionElement = document.querySelector('article span[aria-label]');
            if (captionElement) {
                caption = captionElement.textContent || '';
            }

            return {
                postUrl,
                postCode,
                caption,
                type,
                mediaUrl,
                timestamp: new Date().toISOString(),
                postId: postCode
            };
        });

        if (!postInfo) {
            const message = 'Could not extract post information';
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // To get more detailed info, navigate to the post page
        logActivity(logFilePath, username, `Navigating to post: ${postInfo.postUrl}`);
        await page.goto(postInfo.postUrl, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract more detailed info from post page
        const detailedInfo = await page.evaluate(() => {
            // Try to get a better caption
            let caption = '';
            const captionElements = document.querySelectorAll('h1, article span');
            for (const element of captionElements) {
                const text = element.textContent || '';
                if (text.length > caption.length) {
                    caption = text;
                }
            }

            // Get better media URL
            let mediaUrl = '';
            let type = 'image';

            const img = document.querySelector('article img');
            if (img && img.src) {
                mediaUrl = img.src;
            }

            const video = document.querySelector('article video');
            if (video && video.src) {
                mediaUrl = video.src;
                type = 'video';
            }

            return { caption, mediaUrl, type };
        });

        // Update post info with more detailed data
        if (detailedInfo) {
            if (detailedInfo.caption && detailedInfo.caption.length > postInfo.caption.length) {
                postInfo.caption = detailedInfo.caption;
            }

            if (detailedInfo.mediaUrl) {
                postInfo.mediaUrl = detailedInfo.mediaUrl;
            }

            if (detailedInfo.type) {
                postInfo.type = detailedInfo.type;
            }
        }

        // Log success
        logActivity(logFilePath, username, `Successfully fetched newest post: ${postInfo.postCode}`);

        result.success = true;
        result.message = `Successfully fetched newest post for ${username}`;
        result.post = postInfo;

        return result;
    } catch (error) {
        logActivity(logFilePath, username, `Error fetching post: ${error.message}`);
        result.message = `Error: ${error.message}`;
        return result;
    } finally {
        // Close the browser
        if (browser) {
            await browser.close();
            logActivity(logFilePath, username, 'Browser closed');
        }
    }
};

module.exports = {
    fetchNewestPostWithBrowser,
    logActivity
};
