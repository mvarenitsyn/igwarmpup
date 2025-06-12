const fs = require('fs');
const path = require('path');
const multer = require('multer');
const puppeteer = require('puppeteer');
const { likeStory } = require('../utils/instagram.utils');
const { fetchNewestPostWithPrivateApi } = require('../utils/instagram.private.api');
const queueService = require('../services/queue');
const { log } = require('console');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Save with original name for cookies file
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Create multer upload instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        // Accept only .json files
        if (path.extname(file.originalname) !== '.json') {
            return cb(new Error('Only .json files are allowed'));
        }
        cb(null, true);
    }
});

// Multer middleware for cookie uploads
const uploadCookieFile = upload.single('cookie');

/**
 * Like a story for a specific Instagram username
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const likeUserStory = async (req, res) => {
    // Use multer to handle the file upload
    uploadCookieFile(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No cookie file provided'
            });
        }

        // Get username from request
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }

        // Get browserless configuration
        const browserlessEnabled = req.body.browserless === 'true';
        const browserlessToken = req.body.browserlessToken || '';

        // Determine if headless mode is enabled (default: true)
        const headless = req.body.headless !== 'false';

        try {
            // Set up options for the story like operation
            const options = {
                username,
                cookiesPath: req.file.path,
                logFilePath: path.join(__dirname, '../../logs/activity_log.txt'),
                emojis: ['🔥', '👏', '👍', '❤️'], // Default emojis
                headless,
                browserless: {
                    enabled: browserlessEnabled,
                    endpoint: browserlessToken ?
                        `wss://chrome.browserless.io?token=${browserlessToken}&proxyCountry=us&proxy=residential&proxySticky=true&stealth=true&headless=true` :
                        undefined,
                    options: {
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    }
                }
            };

            // Custom emojis if provided
            if (req.body.emojis) {
                try {
                    const customEmojis = JSON.parse(req.body.emojis);
                    if (Array.isArray(customEmojis) && customEmojis.length > 0) {
                        options.emojis = customEmojis;
                    }
                } catch (e) {
                    console.warn('Failed to parse custom emojis, using defaults');
                }
            }

            console.log(`Starting story like for ${username}`);
            console.log(`Browserless: ${browserlessEnabled ? 'Enabled' : 'Disabled'}`);
            console.log(`Headless: ${headless ? 'Enabled' : 'Disabled'}`);

            // Like the story
            const result = await likeStory(options);

            // Clean up the uploaded file
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting cookie file:', err);
            });

            return res.status(result.success ? 200 : 400).json({
                success: result.success,
                message: result.message,
                emoji: result.emoji,
                username
            });
        } catch (error) {
            console.error('Error in likeUserStory:', error);

            // Clean up the uploaded file on error
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting cookie file:', err);
                });
            }

            return res.status(500).json({
                success: false,
                message: `Server error: ${error.message}`
            });
        }
    });
};

/**
 * Fetch the newest post from a specific Instagram username
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const fetchUserNewestPost = async (req, res) => {
    console.log('Fetching newest post...');
    // Use multer to handle the file upload
    uploadCookieFile(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No cookie file provided'
            });
        }

        // Get username from request
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username is required'
            });
        }

        // Get browserless configuration
        const browserlessEnabled = req.body.browserless === 'true';
        const browserlessToken = req.body.browserlessToken || '';

        // Determine if headless mode is enabled (default: true)
        const headless = req.body.headless !== 'false';

        try {
            // Set up options for the newest post fetch operation
            const options = {
                username,
                cookiesPath: req.file.path,
                logFilePath: path.join(__dirname, '../../logs/activity_log.txt'),
                headless,
                browserless: {
                    enabled: browserlessEnabled,
                    endpoint: browserlessToken ?
                        `wss://chrome.browserless.io?token=${browserlessToken}&proxyCountry=us&proxy=residential&proxySticky=true&stealth=true&headless=true` :
                        undefined,
                    options: {
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    }
                }
            };

            console.log(`Starting newest post fetch for ${username}`);
            console.log(`Browserless: ${browserlessEnabled ? 'Enabled' : 'Disabled'}`);
            console.log(`Headless: ${headless ? 'Enabled' : 'Disabled'}`);

            // Fetch the newest post using the browser-based approach
            const result = await fetchNewestPostWithPrivateApi(options);

            // Clean up the uploaded file
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting cookie file:', err);
            });

            // Return appropriate response based on success status
            if (result.success) {
                return res.status(200).json({
                    success: true,
                    message: result.message,
                    username,
                    post: result.post
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message,
                    username
                });
            }
        } catch (error) {
            console.error('Error in fetchNewestPost:', error);

            // Clean up the uploaded file on error
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting cookie file:', err);
                });
            }

            return res.status(500).json({
                success: false,
                message: `Server error: ${error.message}`
            });
        }
    });
};

/**
 * Like a post using Puppeteer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const likePuppeteerPost = async (req, res) => {
    // Use multer to handle the file upload
    uploadCookieFile(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No cookie file provided'
            });
        }

        // Get post URL from request
        const { postUrl } = req.body;
        if (!postUrl) {
            return res.status(400).json({
                success: false,
                message: 'Post URL is required'
            });
        }

        // Get browserless configuration
        const browserlessEnabled = req.body.browserless === 'true';
        const browserlessToken = req.body.browserlessToken || '';

        // Determine if headless mode is enabled (default: true)
        const headless = req.body.headless !== 'false';

        try {
            // Read cookies from the uploaded file
            const cookiesContent = fs.readFileSync(req.file.path, 'utf8');
            const cookies = JSON.parse(cookiesContent);

            // Set up browser options
            let browser;
            if (browserlessEnabled && browserlessToken) {
                console.log(`Using browserless.com for liking post: ${postUrl}`);
                const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}&proxyCountry=us&proxy=residential&proxySticky=true&stealth=true&headless=true`;
                const puppeteerOptions = {
                    browserWSEndpoint,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                };
                
                try {
                    browser = await puppeteer.connect(puppeteerOptions);
                    console.log('Successfully connected to browserless.com');
                } catch (browserlessError) {
                    console.error('Browserless.io connection failed:', browserlessError.message);
                    if (browserlessError.message.includes('429') || browserlessError.message.includes('rate limit')) {
                        console.log('Rate limit detected, falling back to local browser');
                    } else {
                        console.log('Connection error, falling back to local browser');
                    }
                    
                    // Fallback to local browser
                    browser = await puppeteer.launch({
                        headless: headless ? 'new' : false,
                        args: ['--start-maximized']
                    });
                    console.log('Using local browser as fallback');
                }
            } else {
                console.log(`Using local browser for liking post: ${postUrl}`);
                browser = await puppeteer.launch({
                    headless: headless ? 'new' : false,
                    args: ['--start-maximized']
                });
            }

            const page = await browser.newPage();
            await page.setCookie(...cookies);

            // Set viewport to screen size
            const { width, height } = await page.evaluate(() => ({
                width: window.screen.availWidth,
                height: window.screen.availHeight
            }));

            await page.setViewport({ width, height });
            await page.goto(postUrl, { waitUntil: 'networkidle2' });
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Wait for Like SVGs
            await page.waitForSelector('svg[aria-label="Like"]', { visible: true, timeout: 15000 });

            // Find the SVG with the exact class
            const likeSvgs = await page.$$('svg[aria-label="Like"]');
            let likeSvg = null;

            for (const svg of likeSvgs) {
                const className = await svg.evaluate(node => node.getAttribute('class'));
                if (className && className.split(' ').includes('x1lliihq') &&
                    className.split(' ').includes('x1n2onr6') &&
                    className.split(' ').includes('xyb1xck')) {
                    likeSvg = svg;
                    break;
                }
            }

            if (!likeSvg) {
                await browser.close();

                // Clean up the uploaded file
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting cookie file:', err);
                });

                return res.status(400).json({
                    success: false,
                    message: 'Like button not found on the page'
                });
            }

            // Find and click the like button
            const likeButton = await likeSvg.evaluateHandle(node => {
                while (node && node.getAttribute && node.getAttribute('role') !== 'button') {
                    node = node.parentElement;
                }
                return node;
            });

            const box = await likeButton.boundingBox();
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            //await page.mouse.down();
            //await page.mouse.up();
            await likeButton.click();
            await new Promise(resolve => setTimeout(resolve, 5000));

            await browser.close();

            // Clean up the uploaded file
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting cookie file:', err);
            });

            return res.status(200).json({
                success: true,
                message: 'Post liked successfully',
                postUrl
            });

        } catch (error) {
            console.error('Error in likePuppeteerPost:', error);

            // CRITICAL: Close browser on error to prevent leaks
            if (browser) {
                try {
                    await browser.close();
                    console.log('Browser closed after error');
                } catch (closeError) {
                    console.error('Error closing browser:', closeError);
                }
            }

            // Clean up the uploaded file on error
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting cookie file:', err);
                });
            }

            return res.status(500).json({
                success: false,
                message: `Server error: ${error.message}`
            });
        }
    });
};

/**
 * Post a comment on an Instagram post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const postComment = async (req, res) => {
    // Use multer to handle the file upload
    uploadCookieFile(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Multer error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No cookie file provided'
            });
        }

        // Get parameters from request
        const { postUrl, comment, postId } = req.body;

        if (!postUrl) {
            return res.status(400).json({
                success: false,
                message: 'Post URL is required'
            });
        }

        if (!comment) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        // Note: postId is optional and only used for comment logging to prevent duplicates

        // Ensure the URL is properly formatted
        let validatedUrl;
        try {
            validatedUrl = new URL(postUrl);
            if (!validatedUrl.hostname.includes('instagram.com')) {
                throw new Error('Not an Instagram URL');
            }
            // Validate Instagram post URL format
            if (!postUrl.match(/https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/)) {
                throw new Error('Invalid Instagram post URL format');
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Invalid Instagram URL: ${error.message}`
            });
        }

        // Get browserless configuration
        const browserlessEnabled = req.body.browserless === 'true';
        const browserlessToken = req.body.browserlessToken || '';

        // Determine if headless mode is enabled (default: true)
        const headless = req.body.headless !== 'false';

        // Set up comment log path
        const commentLogPath = path.join(__dirname, '../../logs/comment_log.txt');

        // Check if this post has already been commented on
        if (fs.existsSync(commentLogPath)) {
            const commented = fs.readFileSync(commentLogPath, 'utf8').split('\n').filter(Boolean);
            if (postId && commented.includes(postId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Already commented on this post'
                });
            }
        }

        try {
            // Read cookies from the uploaded file
            const cookiesContent = fs.readFileSync(req.file.path, 'utf8');
            const cookies = JSON.parse(cookiesContent);

            // Set up browser options
            let browser;
            if (browserlessEnabled && browserlessToken) {
                console.log(`Using browserless.com for commenting on post: ${postUrl}`);
                const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}&proxyCountry=us&proxy=residential&proxySticky=true&stealth=true&headless=true`;
                const puppeteerOptions = {
                    browserWSEndpoint,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                };
                
                try {
                    browser = await puppeteer.connect(puppeteerOptions);
                    console.log('Successfully connected to browserless.com');
                } catch (browserlessError) {
                    console.error('Browserless.io connection failed:', browserlessError.message);
                    if (browserlessError.message.includes('429') || browserlessError.message.includes('rate limit')) {
                        console.log('Rate limit detected, falling back to local browser');
                    } else {
                        console.log('Connection error, falling back to local browser');
                    }
                    
                    // Fallback to local browser
                    browser = await puppeteer.launch({
                        headless: headless ? 'new' : false,
                        args: ['--start-maximized']
                    });
                    console.log('Using local browser as fallback');
                }
            } else {
                console.log(`Using local browser for commenting on post: ${postUrl}`);
                browser = await puppeteer.launch({
                    headless: headless ? 'new' : false,
                    args: ['--start-maximized']
                });
            }

            const page = await browser.newPage();
            await page.setCookie(...cookies);

            // Set viewport to screen size
            const { width, height } = await page.evaluate(() => ({
                width: window.screen.availWidth,
                height: window.screen.availHeight
            }));

            await page.setViewport({ width, height });

            // Go straight to post URL without visiting user page first
            console.log(`Attempting to post comment to: ${postUrl}`);
            console.log(`Comment text: ${comment}`);

            await page.goto(postUrl, { waitUntil: 'networkidle2' });
            await new Promise(res => setTimeout(res, getRandomDelay(2000, 5000)));

            // Add the comment
            const textAreaSelector = 'textarea[aria-label="Add a comment…"][placeholder="Add a comment…"]';
            await page.waitForSelector(textAreaSelector, { visible: true, timeout: 15000 });

            const textArea = await page.$(textAreaSelector);
            const boundingBoxTextArea = await textArea.boundingBox();

            await page.mouse.move(
                boundingBoxTextArea.x + boundingBoxTextArea.width / 2,
                boundingBoxTextArea.y + boundingBoxTextArea.height / 2
            );

            await page.mouse.down();
            await page.mouse.up();
            await page.click(textAreaSelector);
            await page.type(textAreaSelector, comment, { delay: 50 });
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Log the comment if postId is provided
            if (postId) {
                // Ensure logs directory exists
                const logsDir = path.join(__dirname, '../../logs');
                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }

                fs.appendFileSync(commentLogPath, postId + '\n');
            }

            await browser.close();
            console.log('Comment sent and browser closed.');

            // Clean up the uploaded file
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting cookie file:', err);
            });

            return res.status(200).json({
                success: true,
                message: 'Comment posted successfully',
                postUrl
            });

        } catch (error) {
            console.error('Error in postComment:', error);

            // CRITICAL: Close browser on error to prevent leaks
            if (browser) {
                try {
                    await browser.close();
                    console.log('Browser closed after error');
                } catch (closeError) {
                    console.error('Error closing browser:', closeError);
                }
            }

            // Clean up the uploaded file on error
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting cookie file:', err);
                });
            }

            return res.status(500).json({
                success: false,
                message: `Server error: ${error.message}`
            });
        }
    });
};

/**
 * Helper function to get random delay
 */
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Configure multer for memory storage (for new endpoints)
const uploadMemory = multer({ storage: multer.memoryStorage() });

/**
 * Get similar accounts for a username using job queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSimilarAccounts = async (req, res) => {
    try {
        const { targetUsername } = req.body;

        if (!targetUsername) {
            return res.status(400).json({
                error: 'Target username is required',
                status: 'error',
                code: 'MISSING_USERNAME'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'Cookie file is required',
                status: 'error',
                code: 'MISSING_COOKIE_FILE'
            });
        }

        try {
            const cookieData = req.file.buffer.toString('base64');

            let browserlessOptions = null;
            if (req.body.browserless) {
                try {
                    browserlessOptions = JSON.parse(req.body.browserless);
                    // Add default proxy settings if browserless is enabled but queryParams not provided
                    if (browserlessOptions.enabled && !browserlessOptions.queryParams) {
                        browserlessOptions.queryParams = {
                            proxyCountry: "us",
                            proxy: "residential",
                            proxySticky: true,
                            stealth: true,
                            headless: true
                        };
                    }
                } catch (parseError) {
                    console.error('Error parsing browserless options:', parseError);
                    return res.status(400).json({
                        error: 'Invalid browserless options format',
                        status: 'error',
                        code: 'INVALID_BROWSERLESS_OPTIONS'
                    });
                }
            }

            let browserOptions = {};
            if (req.body.browserOptions) {
                try {
                    browserOptions = JSON.parse(req.body.browserOptions);
                } catch (parseError) {
                    console.error('Error parsing browser options:', parseError);
                    return res.status(400).json({
                        error: 'Invalid browser options format',
                        status: 'error',
                        code: 'INVALID_BROWSER_OPTIONS'
                    });
                }
            }

            if (!browserOptions.timeouts) {
                browserOptions.timeouts = {
                    navigationTimeout: 60000,
                    defaultTimeout: 30000
                };
            }

            const options = {
                browserless: browserlessOptions,
                ...browserOptions
            };

            console.log('Controller passing options to queue service:', JSON.stringify(options, null, 2));

            const jobId = await queueService.addSimilarAccountsJob(
                targetUsername,
                cookieData,
                options
            );

            return res.status(202).json({
                jobId,
                status: 'queued',
                code: 'JOB_QUEUED',
                message: 'Job has been queued and will be processed soon',
                estimatedTime: '30-60 seconds'
            });
        } catch (error) {
            console.error('Error processing request data:', error);
            return res.status(400).json({
                error: 'Invalid request data: ' + error.message,
                status: 'error',
                code: 'INVALID_REQUEST_DATA'
            });
        }
    } catch (error) {
        console.error('Error queuing similar accounts job:', error);
        return res.status(500).json({
            error: error.message || 'Server error',
            status: 'error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Send message to a user using job queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendMessage = async (req, res) => {
    try {
        const { targetUsername, message } = req.body;

        if (!targetUsername) {
            return res.status(400).json({
                error: 'Target username is required',
                status: 'error',
                code: 'MISSING_USERNAME'
            });
        }

        if (!message) {
            return res.status(400).json({
                error: 'Message content is required',
                status: 'error',
                code: 'MISSING_MESSAGE'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'Cookie file is required',
                status: 'error',
                code: 'MISSING_COOKIE_FILE'
            });
        }

        try {
            const cookieData = req.file.buffer.toString('base64');

            let browserlessOptions = null;
            if (req.body.browserless) {
                try {
                    browserlessOptions = JSON.parse(req.body.browserless);
                    // Add default proxy settings if browserless is enabled but queryParams not provided
                    if (browserlessOptions.enabled && !browserlessOptions.queryParams) {
                        browserlessOptions.queryParams = {
                            proxyCountry: "us",
                            proxy: "residential",
                            proxySticky: true,
                            stealth: true,
                            headless: true
                        };
                    }
                } catch (parseError) {
                    console.error('Error parsing browserless options:', parseError);
                    return res.status(400).json({
                        error: 'Invalid browserless options format',
                        status: 'error',
                        code: 'INVALID_BROWSERLESS_OPTIONS'
                    });
                }
            }

            let browserOptions = {};
            if (req.body.browserOptions) {
                try {
                    browserOptions = JSON.parse(req.body.browserOptions);
                } catch (parseError) {
                    console.error('Error parsing browser options:', parseError);
                    return res.status(400).json({
                        error: 'Invalid browser options format',
                        status: 'error',
                        code: 'INVALID_BROWSER_OPTIONS'
                    });
                }
            }

            if (!browserOptions.timeouts) {
                browserOptions.timeouts = {
                    navigationTimeout: 60000,
                    defaultTimeout: 30000
                };
            }

            const options = {
                browserless: browserlessOptions,
                ...browserOptions
            };

            console.log('Controller passing options to queue service (send message job):', JSON.stringify(options, null, 2));

            const jobId = await queueService.addSendMessageJob(
                targetUsername,
                message,
                cookieData,
                options
            );

            return res.status(202).json({
                jobId,
                status: 'queued',
                code: 'JOB_QUEUED',
                message: 'Send message job has been queued and will be processed soon',
                estimatedTime: '30-60 seconds'
            });
        } catch (error) {
            console.error('Error processing request data:', error);
            return res.status(400).json({
                error: 'Invalid request data: ' + error.message,
                status: 'error',
                code: 'INVALID_REQUEST_DATA'
            });
        }
    } catch (error) {
        console.error('Error queuing send message job:', error);
        return res.status(500).json({
            error: error.message || 'Server error',
            status: 'error',
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Follow a user using job queue
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const followUser = async (req, res) => {
    try {
        const { targetUsername } = req.body;

        if (!targetUsername) {
            return res.status(400).json({
                error: 'Target username is required',
                status: 'error',
                code: 'MISSING_USERNAME'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'Cookie file is required',
                status: 'error',
                code: 'MISSING_COOKIE_FILE'
            });
        }

        try {
            const cookieData = req.file.buffer.toString('base64');

            let browserlessOptions = null;
            if (req.body.browserless) {
                try {
                    browserlessOptions = JSON.parse(req.body.browserless);
                    // Add default proxy settings if browserless is enabled but queryParams not provided
                    if (browserlessOptions.enabled && !browserlessOptions.queryParams) {
                        browserlessOptions.queryParams = {
                            proxyCountry: "us",
                            proxy: "residential",
                            proxySticky: true,
                            stealth: true,
                            headless: true
                        };
                    }
                } catch (parseError) {
                    console.error('Error parsing browserless options:', parseError);
                    return res.status(400).json({
                        error: 'Invalid browserless options format',
                        status: 'error',
                        code: 'INVALID_BROWSERLESS_OPTIONS'
                    });
                }
            }

            let browserOptions = {};
            if (req.body.browserOptions) {
                try {
                    browserOptions = JSON.parse(req.body.browserOptions);
                } catch (parseError) {
                    console.error('Error parsing browser options:', parseError);
                    return res.status(400).json({
                        error: 'Invalid browser options format',
                        status: 'error',
                        code: 'INVALID_BROWSER_OPTIONS'
                    });
                }
            }

            if (!browserOptions.timeouts) {
                browserOptions.timeouts = {
                    navigationTimeout: 60000,
                    defaultTimeout: 30000
                };
            }

            const options = {
                browserless: browserlessOptions,
                ...browserOptions
            };

            console.log('Controller passing options to queue service (follow job):', JSON.stringify(options, null, 2));

            const jobId = await queueService.addFollowJob(
                targetUsername,
                cookieData,
                options
            );

            return res.status(202).json({
                jobId,
                status: 'queued',
                code: 'JOB_QUEUED',
                message: 'Follow job has been queued and will be processed soon',
                estimatedTime: '30-60 seconds'
            });
        } catch (error) {
            console.error('Error processing request data:', error);
            return res.status(400).json({
                error: 'Invalid request data: ' + error.message,
                status: 'error',
                code: 'INVALID_REQUEST_DATA'
            });
        }
    } catch (error) {
        console.error('Error queuing follow job:', error);
        return res.status(500).json({
            error: error.message || 'Server error',
            status: 'error',
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    likeUserStory,
    fetchNewestPost: fetchUserNewestPost,
    likePuppeteerPost,
    postComment,
    getSimilarAccounts,
    followUser,
    sendMessage,
    uploadMemory
};
