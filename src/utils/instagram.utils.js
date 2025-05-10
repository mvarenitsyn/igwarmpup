const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Random delay function to make automation look more human-like
 * @param {Object} delayConfig - Configuration for random delay
 * @returns {Promise} Promise that resolves after a random delay
 */
const randomDelay = async (delayConfig = { min: 3000, max: 7000 }) => {
    const delay = Math.floor(
        Math.random() * (delayConfig.max - delayConfig.min + 1) + delayConfig.min
    );
    console.log(`Waiting for ${delay}ms...`);
    return new Promise((resolve) => setTimeout(resolve, delay));
};

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
 * @param {string} emoji - Emoji used (optional)
 */
const logActivity = (logFilePath, username, action, emoji = null) => {
    const timestamp = new Date().toISOString();
    const status = emoji ? `${action} (${emoji})` : action;
    const logEntry = `[${timestamp}] ${username} - ${status}\n`;

    console.log(`${username} - ${status}`);
    fs.appendFileSync(logFilePath, logEntry);
};

/**
 * Initialize the Instagram puppeteer session
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Browser and page objects
 */
const initInstagramSession = async (options) => {
    const { cookiesPath, browserless = { enabled: false }, headless = true } = options;

    let browser;

    try {
        // Launch browser (either local or browserless.com)
        if (browserless.enabled && browserless.endpoint) {
            console.log('Connecting to browserless.com...');
            // Add proxy parameters to the browserless endpoint
            let browserlessEndpoint = browserless.endpoint;
            if (!browserlessEndpoint.includes('proxy=')) {
                const separator = browserlessEndpoint.includes('?') ? '&' : '?';
                browserlessEndpoint += `${separator}proxy=residential&proxyCountry=us&proxySticky=true`;
            }
            console.log(`Using endpoint with proxy: ${browserlessEndpoint}`);

            browser = await puppeteer.connect({
                browserWSEndpoint: browserlessEndpoint,
                defaultViewport: null,
                ...(browserless.options || {})
            });
            console.log('Connected to browserless.com');
        } else {
            console.log('Launching local browser...');
            browser = await puppeteer.launch({
                headless: headless ? "new" : false,
                defaultViewport: null, // Use default viewport of the browser
                args: ['--start-maximized'], // Start with maximized browser window
            });
        }

        const page = await browser.newPage();

        // Load cookies
        const cookies = loadCookies(cookiesPath);
        await page.setCookie(...cookies);

        // Navigate to Instagram
        console.log('Navigating to Instagram...');
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2' });

        // Check if we're logged in
        console.log('Checking login status...');
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('input[name="username"]');
        });

        if (!isLoggedIn) {
            await browser.close();
            throw new Error('Not logged in. Please check your cookies file.');
        }

        console.log('Successfully logged in!');
        await randomDelay();

        return { browser, page };
    } catch (error) {
        if (browser) {
            await browser.close();
        }
        throw error;
    }
};

/**
 * Get a random emoji from the configured list
 * @param {Array} emojis - List of emojis to choose from
 * @param {string} lastUsedEmoji - Last used emoji to avoid repetition
 * @returns {string} Random emoji
 */
const getRandomEmoji = (emojis, lastUsedEmoji = null) => {
    if (emojis.length <= 1) return emojis[0];

    // Filter out the last used emoji to ensure rotation
    const availableEmojis = lastUsedEmoji ? emojis.filter(emoji => emoji !== lastUsedEmoji) : emojis;

    // Get a random emoji from the available ones
    const randomIndex = Math.floor(Math.random() * availableEmojis.length);
    return availableEmojis[randomIndex];
};

/**
 * Like a story for a specific Instagram username
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result of the operation
 */
const likeStory = async (options) => {
    const {
        username,
        cookiesPath,
        logFilePath = path.join(__dirname, '../../logs/activity_log.txt'),
        emojis = ['🔥', '👏', '👍', '❤️'],
        browserless = { enabled: false },
        headless = true
    } = options;

    // Create logs directory if it doesn't exist
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // Initialize log file with header if it doesn't exist
    const timestamp = new Date().toISOString();
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, `=== Instagram Story Automation Session Started at ${timestamp} ===\n`);
    } else {
        fs.appendFileSync(logFilePath, `\n=== Instagram Story Automation Session Started at ${timestamp} ===\n`);
    }

    let browser;
    let page;
    let result = {
        success: false,
        message: '',
        emoji: null
    };

    try {
        // Initialize Instagram session
        const session = await initInstagramSession({
            cookiesPath,
            browserless,
            headless
        });

        browser = session.browser;
        page = session.page;

        // Log attempt
        logActivity(logFilePath, username, 'Attempting to view stories for');

        // Navigate to user's stories
        const storyUrl = `https://www.instagram.com/stories/${username}/`;
        await page.goto(storyUrl, { waitUntil: 'networkidle2' });

        // Check for warning words or error messages
        const pageCheck = await page.evaluate(() => {
            const bodyText = document.body.innerText.toLowerCase();

            // Check for account not found messages
            if (bodyText.includes("sorry, this page isn't available") ||
                bodyText.includes("page not found") ||
                bodyText.includes("the link you followed may be broken")) {
                return { status: 'not_found', message: 'Account not found or page not available' };
            }

            // Check for warning words that indicate account issues
            const warningWords = ['attempt', 'locked', 'limit', 'suspicious', 'unusual', 'security', 'verify', 'blocked'];
            for (const word of warningWords) {
                if (bodyText.includes(word)) {
                    return { status: 'warning', message: `Warning word "${word}" detected on page` };
                }
            }

            return { status: 'ok', message: 'Page loaded successfully' };
        });

        if (pageCheck.status === 'not_found') {
            logActivity(logFilePath, username, pageCheck.message);
            result.message = pageCheck.message;
            return result;
        }

        if (pageCheck.status === 'warning') {
            logActivity(logFilePath, username, pageCheck.message);
            result.message = pageCheck.message;
            return result;
        }

        // Try to click the "View story" button if it exists
        let hasViewStoryButton = false;
        try {
            // Use the specific selector that worked in the logs
            const viewStoryButtonSelector = 'div[role="button"]:not([aria-disabled="true"]):not([aria-hidden="true"]):not([aria-label]):not([aria-selected]):not([aria-pressed]):not([aria-checked]):not([aria-expanded])';
            const hasSpecificButton = await page.evaluate((selector) => {
                const buttons = Array.from(document.querySelectorAll(selector));
                const viewStoryButton = buttons.find(btn => btn.textContent.includes('View story'));
                if (viewStoryButton) {
                    viewStoryButton.click();
                    return true;
                }
                return false;
            }, viewStoryButtonSelector);

            if (hasSpecificButton) {
                console.log(`Found and clicked "View story" button for ${username}`);
                hasViewStoryButton = true;
            }
        } catch (error) {
            console.log(`Error finding "View story" button: ${error.message}`);
        }

        if (hasViewStoryButton) {
            // Wait 1-2 seconds after clicking View story button
            const viewStoryDelay = Math.floor(Math.random() * 500) + 1000;
            await new Promise(resolve => setTimeout(resolve, viewStoryDelay));

            // Use the working approach for story dialog detection
            try {
                await page.waitForSelector('div.x1n2onr6', { timeout: 10000 });
            } catch (error) {
                // Continue anyway as the dialog might still be there
            }
        }

        // Check if stories are available using the working approach
        const hasStories = await page.evaluate(() => {
            return !!document.querySelector('div.x1n2onr6');
        });

        if (!hasStories) {
            logActivity(logFilePath, username, 'No stories available');
            result.message = 'No stories available';
            return result;
        }

        console.log(`Stories found for ${username}, proceeding to interaction`);

        // Reduced waiting time (0.5-2 seconds)
        const reducedWaitTime = Math.floor(Math.random() * 1500) + 500;
        await new Promise(resolve => setTimeout(resolve, reducedWaitTime));

        // Select random emoji
        const emoji = getRandomEmoji(emojis);
        result.emoji = emoji;

        // Full textarea selector from debug logs
        const textAreaSelector = 'textarea.x1i10hfl.xjbqb8w.x972fbf.xcfux6l.x1qhh985.xm0m39n.x7e90pr.xw3qccf.x1a2a7pz.xw2csxc.x1odjw0f.x1y1aw1k.xpvbz4a.xwib8y2.xohu8s8.xtt52l0.xh8yej3.xomwbyg';

        // Simplified selector (as a fallback)
        const simpleTextAreaSelector = 'textarea[placeholder^="Reply to"]';

        // Try to find the textarea
        let textareaFound = false;

        try {
            await page.waitForSelector(textAreaSelector, { visible: true, timeout: 3000 });
            textareaFound = true;
        } catch (error) {
            try {
                await page.waitForSelector(simpleTextAreaSelector, { visible: true, timeout: 3000 });
                textareaFound = true;
            } catch (selectorError) {
                // Couldn't find textarea with either selector
            }
        }

        if (!textareaFound) {
            logActivity(logFilePath, username, 'Could not find reply textarea');
            result.message = 'Could not find reply textarea';
            return result;
        }

        // Try to click the textarea
        try {
            await page.click(textAreaSelector);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            try {
                await page.click(simpleTextAreaSelector);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (clickError) {
                logActivity(logFilePath, username, 'Failed to click textarea');
                result.message = 'Failed to click textarea';
                return result;
            }
        }

        // Type the emoji
        if (emoji.length > 1) {
            for (const char of emoji) {
                await page.keyboard.type(char);
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
            }
        } else {
            await page.keyboard.type(emoji);
        }

        // Wait a moment before pressing Enter
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

        // Press Enter to send
        await page.keyboard.press('Enter');

        // Log success
        logActivity(logFilePath, username, 'Sent reaction by typing', emoji);

        // Wait a moment after sending
        await randomDelay();

        result.success = true;
        result.message = `Successfully sent reaction ${emoji} to ${username}'s story`;

        return result;
    } catch (error) {
        logActivity(logFilePath, username, `Error processing: ${error.message}`);
        result.message = `Error: ${error.message}`;
        return result;
    } finally {
        // Close the browser
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
};

/**
 * Fetch the newest post of an Instagram user
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result of the operation
 */
const fetchNewestPost = async (options) => {
    const {
        username,
        cookiesPath,
        logFilePath = path.join(__dirname, '../../logs/activity_log.txt'),
        browserless = { enabled: false },
        headless = true
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

    let browser;
    let page;
    let result = {
        success: false,
        message: '',
        post: null
    };

    try {
        // Initialize Instagram session
        const session = await initInstagramSession({
            cookiesPath,
            browserless,
            headless
        });

        browser = session.browser;
        page = session.page;

        // Log attempt
        logActivity(logFilePath, username, 'Attempting to fetch newest post');

        // Navigate to user's profile
        const profileUrl = `https://www.instagram.com/${username}/`;
        await page.goto(profileUrl, { waitUntil: 'networkidle2' });

        // Check if the profile exists and is accessible
        const pageCheck = await page.evaluate(() => {
            const bodyText = document.body.innerText.toLowerCase();

            // Check for account not found messages
            if (bodyText.includes("sorry, this page isn't available") ||
                bodyText.includes("page not found") ||
                bodyText.includes("the link you followed may be broken")) {
                return { status: 'not_found', message: 'Account not found or page not available' };
            }

            // Check for warning words that indicate account issues
            const warningWords = ['attempt', 'locked', 'limit', 'suspicious', 'unusual', 'security', 'verify', 'blocked'];
            for (const word of warningWords) {
                if (bodyText.includes(word)) {
                    return { status: 'warning', message: `Warning word "${word}" detected on page` };
                }
            }

            return { status: 'ok', message: 'Page loaded successfully' };
        });

        if (pageCheck.status === 'not_found') {
            logActivity(logFilePath, username, pageCheck.message);
            result.message = pageCheck.message;
            return result;
        }

        if (pageCheck.status === 'warning') {
            logActivity(logFilePath, username, pageCheck.message);
            result.message = pageCheck.message;
            return result;
        }

        // Wait for posts to load - using a more specific selector for Instagram posts
        await page.waitForSelector('article, div[data-test-id="post-container"], div._aagv', { timeout: 10000 }).catch(() => { });

        // Debug page content
        console.log('Checking for posts...');

        // Add a delay to ensure content is fully loaded
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check if the user has posts with multiple possible selectors
        const hasPosts = await page.evaluate(() => {
            const selectors = ['article', 'div[data-test-id="post-container"]', 'div._aagv', 'a[href*="/p/"]'];
            for (const selector of selectors) {
                if (document.querySelector(selector)) {
                    console.log(`Found posts using selector: ${selector}`);
                    return true;
                }
            }
            console.log('No posts found with any selector');
            return false;
        });

        if (!hasPosts) {
            const message = 'No posts available for this user';
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
        }

        // Extract information about the most recent post with more flexibility
        const postInfo = await page.evaluate(() => {
            // Try different selectors for finding posts
            let container = null;
            let link = null;

            // First try classic article approach
            container = document.querySelector('article');
            if (container) {
                link = container.querySelector('a[href*="/p/"]');
            }

            // Try finding any link to a post if container approach failed
            if (!link) {
                link = document.querySelector('a[href*="/p/"]');
                if (link) {
                    container = link.closest('div');
                }
            }

            // Last resort: try with class-based selectors
            if (!link) {
                const possibleLinks = document.querySelectorAll('a');
                for (const possibleLink of possibleLinks) {
                    if (possibleLink.href && possibleLink.href.includes('/p/')) {
                        link = possibleLink;
                        container = link.closest('div');
                        break;
                    }
                }
            }

            // If we couldn't find any post link, give up
            if (!link) {
                console.log('Could not find any post links');
                return null;
            }

            console.log('Found post link:', link.href);

            // Extract post URL
            const postUrl = link.href;

            // Extract post code from URL
            const urlParts = postUrl.split('/');
            const postCode = urlParts.find(part => part.includes('p/')) ?
                urlParts[urlParts.indexOf('p') + 1] :
                urlParts.filter(Boolean).pop();

            // Try different methods to get the caption
            let caption = '';
            if (container) {
                // Try heading first
                const headings = container.querySelectorAll('h1, h2, h3');
                for (const heading of headings) {
                    if (heading.textContent && heading.textContent.trim().length > 0) {
                        caption = heading.textContent.trim();
                        break;
                    }
                }

                // Try spans next
                if (!caption) {
                    const spans = container.querySelectorAll('span');
                    for (const span of spans) {
                        // Look for longer text that might be a caption
                        if (span.textContent && span.textContent.trim().length > 10) {
                            caption = span.textContent.trim();
                            break;
                        }
                    }
                }
            }

            // Determine if it's a video (reel) or image post - check entire document
            const hasVideo = document.querySelector('video') !== null;

            // Extract image/video URL if possible
            let mediaUrl = '';
            if (hasVideo) {
                const videoElement = document.querySelector('video');
                if (videoElement) {
                    mediaUrl = videoElement.src || '';
                }
            } else {
                // Try multiple image selectors
                const imgSelectors = [
                    'img[data-testid="post-image"]',
                    'img.FFVAD',
                    'img._aagt',
                    container ? 'img' : null
                ].filter(Boolean);

                for (const selector of imgSelectors) {
                    const img = document.querySelector(selector);
                    if (img && img.src) {
                        mediaUrl = img.src;
                        break;
                    }
                }

                // If none of the specific selectors worked, try all images
                if (!mediaUrl) {
                    const allImages = document.querySelectorAll('img');
                    for (const img of allImages) {
                        // Skip tiny images that are likely icons
                        if (img.height > 100 && img.width > 100 && img.src) {
                            mediaUrl = img.src;
                            break;
                        }
                    }
                }
            }

            return {
                postUrl,
                postCode,
                caption,
                type: hasVideo ? 'video' : 'image',
                mediaUrl,
                timestamp: new Date().toISOString()
            };
        });

        if (!postInfo) {
            const message = 'Could not extract post information';
            logActivity(logFilePath, username, message);
            result.message = message;
            return result;
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
            console.log('Browser closed');
        }
    }
};

module.exports = {
    likeStory,
    loadCookies,
    randomDelay,
    logActivity,
    getRandomEmoji,
    initInstagramSession,
    fetchNewestPost
};
