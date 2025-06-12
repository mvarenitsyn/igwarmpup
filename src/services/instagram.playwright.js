const { chromium } = require('playwright');
require('dotenv').config();

class InstagramService {
    constructor() {
        this.baseUrl = process.env.INSTAGRAM_URL || 'https://www.instagram.com';
    }

    async initBrowser(options = {}, cookieData) {
        let browser;
        const pageDelay = options.pageDelay || 3000;

        if (options.browserless && options.browserless.enabled) {
            const { token, queryParams } = options.browserless;
            let browserlessUrl = `wss://production-sfo.browserless.io/chromium/playwright?token=${token}`;

            if (queryParams) {
                console.log('Using browserless.io with parameters:');
                Object.entries(queryParams).forEach(([key, value]) => {
                    browserlessUrl += `&${key}=${encodeURIComponent(value)}`;
                    console.log(`  - ${key}: ${value}`);
                });
            }

            console.log(`Connecting to browserless.io`);

            try {
                const connectionPromise = chromium.connect(browserlessUrl);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Browserless connection timeout after 45 seconds')), 45000);
                });

                browser = await Promise.race([connectionPromise, timeoutPromise]);
                console.log('Successfully connected to browserless.io');
            } catch (browserlessError) {
                console.error('Error connecting to browserless.io:', browserlessError.message);
                
                if (browserlessError.message.includes('429')) {
                    console.log('Rate limit detected (429) - falling back to local browser');
                } else if (browserlessError.message.includes('timeout')) {
                    console.log('Connection timeout - falling back to local browser');
                } else {
                    console.log('Connection error - falling back to local browser');
                }

                browser = await chromium.launch({
                    headless: options.headless !== undefined ? options.headless : true,
                    slowMo: options.debug ? 50 : 0
                });
                console.log('Successfully launched local browser as fallback');
            }
        } else {
            console.log('Using local browser');
            browser = await chromium.launch({
                headless: options.headless !== undefined ? options.headless : true,
                slowMo: options.debug ? 50 : 0
            });
            console.log('Successfully launched local browser instance');
        }

        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
        });

        if (cookieData) {
            try {
                const cookies = JSON.parse(cookieData.toString());
                const processedCookies = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path || '/',
                    expires: cookie.expirationDate ? cookie.expirationDate : undefined,
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax'
                }));

                await context.addCookies(processedCookies);
                console.log(`Added ${processedCookies.length} cookies to browser context`);
            } catch (error) {
                console.error('Error parsing cookies:', error);
                throw new Error(`Cookie parsing failed: ${error.message}`);
            }
        }

        const page = await context.newPage();
        
        if (options.timeouts) {
            page.setDefaultNavigationTimeout(options.timeouts.navigationTimeout || 60000);
            page.setDefaultTimeout(options.timeouts.defaultTimeout || 30000);
        }

        return { browser, page, context, pageDelay };
    }

    async getSimilarAccounts(username, cookieData, options = {}) {
        let browser, page, context;
        
        try {
            console.log(`Starting similar accounts search for: ${username}`);
            const { browser: browserInstance, page: pageInstance, context: contextInstance, pageDelay } = await this.initBrowser(options, cookieData);
            browser = browserInstance;
            page = pageInstance;
            context = contextInstance;

            const userProfileUrl = `${this.baseUrl}/${username}/`;
            console.log(`Navigating to user profile: ${userProfileUrl}`);
            
            await page.goto(userProfileUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(pageDelay);

            // Multiple strategies to find similar accounts
            const similarAccounts = [];
            
            // Strategy 1: Look for "Suggested for you" section
            try {
                const suggestedSelector = '[data-testid="user-suggestions"] a[href*="/"]';
                await page.waitForSelector(suggestedSelector, { timeout: 10000 });
                const suggestedLinks = await page.$$eval(suggestedSelector, links => 
                    links.map(link => link.href.split('/').filter(Boolean).pop()).filter(Boolean)
                );
                similarAccounts.push(...suggestedLinks.slice(0, 10));
                console.log(`Found ${suggestedLinks.length} accounts from suggestions`);
            } catch (error) {
                console.log('Strategy 1 failed, trying alternative approaches');
            }

            // Strategy 2: Look for followers/following lists
            if (similarAccounts.length < 5) {
                try {
                    const followersLink = await page.$('a[href*="/followers/"]');
                    if (followersLink) {
                        await followersLink.click();
                        await page.waitForTimeout(3000);
                        
                        const followerSelector = '[role="dialog"] a[href*="/"]';
                        await page.waitForSelector(followerSelector, { timeout: 10000 });
                        const followerLinks = await page.$$eval(followerSelector, links => 
                            links.map(link => link.href.split('/').filter(Boolean).pop()).filter(Boolean)
                        );
                        similarAccounts.push(...followerLinks.slice(0, 15));
                        console.log(`Found ${followerLinks.length} accounts from followers`);
                        
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(1000);
                    }
                } catch (error) {
                    console.log('Strategy 2 failed');
                }
            }

            // Remove duplicates and the original username
            const uniqueAccounts = [...new Set(similarAccounts)]
                .filter(account => account !== username && account.length > 0)
                .slice(0, 20);

            console.log(`Successfully found ${uniqueAccounts.length} similar accounts`);
            return uniqueAccounts;

        } catch (error) {
            console.error('Error in getSimilarAccounts:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async followUser(username, cookieData, options = {}) {
        let browser, page, context;
        
        try {
            console.log(`Starting follow operation for: ${username}`);
            const { browser: browserInstance, page: pageInstance, context: contextInstance, pageDelay } = await this.initBrowser(options, cookieData);
            browser = browserInstance;
            page = pageInstance;
            context = contextInstance;

            const userProfileUrl = `${this.baseUrl}/${username}/`;
            console.log(`Navigating to user profile: ${userProfileUrl}`);
            
            await page.goto(userProfileUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(pageDelay);

            // Look for follow button with multiple strategies
            let followButton = null;
            
            // Strategy 1: Look for "Follow" button
            try {
                followButton = await page.$('button:has-text("Follow")');
                if (!followButton) {
                    followButton = await page.$('[role="button"]:has-text("Follow")');
                }
            } catch (error) {
                console.log('Strategy 1 failed');
            }

            // Strategy 2: Look for follow button by aria-label
            if (!followButton) {
                try {
                    followButton = await page.$('button[aria-label*="Follow"]');
                } catch (error) {
                    console.log('Strategy 2 failed');
                }
            }

            if (!followButton) {
                // Check if already following
                const unfollowButton = await page.$('button:has-text("Following")');
                if (unfollowButton) {
                    return {
                        success: false,
                        message: `Already following ${username}`
                    };
                }
                
                throw new Error('Follow button not found - user may be private or page structure changed');
            }

            await followButton.click();
            await page.waitForTimeout(2000);

            // Verify follow action was successful
            const isFollowing = await page.$('button:has-text("Following")') || 
                               await page.$('button:has-text("Requested")');
            
            if (isFollowing) {
                console.log(`Successfully followed ${username}`);
                return {
                    success: true,
                    message: `Successfully followed ${username}`
                };
            } else {
                return {
                    success: false,
                    message: `Follow action may have failed for ${username}`
                };
            }

        } catch (error) {
            console.error('Error in followUser:', error);
            return {
                success: false,
                message: `Failed to follow ${username}: ${error.message}`
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    async sendMessage(username, message, cookieData, options = {}) {
        let browser, page, context;
        
        try {
            console.log(`Starting message send to: ${username}`);
            const { browser: browserInstance, page: pageInstance, context: contextInstance, pageDelay } = await this.initBrowser(options, cookieData);
            browser = browserInstance;
            page = pageInstance;
            context = contextInstance;

            const userProfileUrl = `${this.baseUrl}/${username}/`;
            console.log(`Navigating to user profile: ${userProfileUrl}`);
            
            await page.goto(userProfileUrl, { waitUntil: 'networkidle' });
            await page.waitForTimeout(pageDelay);

            // Multiple strategies to find message button
            let messageButtonFound = false;
            
            // Strategy 1: Look for direct "Message" button
            try {
                const directMessageSelectors = [
                    'div[role="button"]:has-text("Message")',
                    'div[role="button"][tabindex="0"]:has-text("Message")',
                    'button:has-text("Message")'
                ];

                for (const selector of directMessageSelectors) {
                    const messageButton = await page.$(selector);
                    if (messageButton) {
                        const buttonText = await messageButton.textContent();
                        if (buttonText && buttonText.includes('Message')) {
                            await messageButton.click();
                            console.log(`Clicked direct message button`);
                            messageButtonFound = true;
                            await page.waitForTimeout(3000);
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log('Direct message button strategy failed');
            }

            // Strategy 2: Look for Options button then "Send message"
            if (!messageButtonFound) {
                try {
                    const optionsSelectors = [
                        'svg[aria-label="Options"]',
                        '[aria-label="Options"]',
                        '[aria-label="More options"]'
                    ];

                    let optionsClicked = false;
                    for (const selector of optionsSelectors) {
                        const optionsButton = await page.$(selector);
                        if (optionsButton) {
                            await optionsButton.click();
                            console.log(`Clicked options button`);
                            optionsClicked = true;
                            await page.waitForTimeout(3000);
                            break;
                        }
                    }

                    if (optionsClicked) {
                        const sendMessageSelectors = [
                            'button:has-text("Send message")',
                            '[role="button"]:has-text("Send message")'
                        ];

                        for (const selector of sendMessageSelectors) {
                            const sendMessageButton = await page.$(selector);
                            if (sendMessageButton) {
                                await sendMessageButton.click();
                                console.log(`Clicked send message option`);
                                messageButtonFound = true;
                                await page.waitForTimeout(3000);
                                break;
                            }
                        }
                    }
                } catch (error) {
                    console.log('Options button strategy failed');
                }
            }

            if (!messageButtonFound) {
                throw new Error('Message button not found - user may have restricted messaging');
            }

            // Handle "Not Now" popup if it appears
            try {
                const notNowButton = await page.$('button:has-text("Not Now")');
                if (notNowButton) {
                    await notNowButton.click();
                    console.log('Dismissed "Not Now" popup');
                    await page.waitForTimeout(2000);
                }
            } catch (error) {
                // No popup, continue
            }

            // Find and click text area for typing
            const textAreaSelectors = [
                'div[contenteditable="true"]',
                'div[role="textbox"]',
                '[contenteditable="true"]'
            ];

            let textAreaFound = false;
            for (const selector of textAreaSelectors) {
                try {
                    const textArea = await page.$(selector);
                    if (textArea) {
                        await textArea.click();
                        console.log(`Clicked text area`);
                        textAreaFound = true;
                        await page.waitForTimeout(1000);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!textAreaFound) {
                throw new Error('Message text area not found');
            }

            // Type the message with support for line breaks
            console.log('Typing message...');
            const messageLines = message.split('\n');
            for (let i = 0; i < messageLines.length; i++) {
                await page.keyboard.type(messageLines[i]);
                if (i < messageLines.length - 1) {
                    await page.keyboard.down('Shift');
                    await page.keyboard.press('Enter');
                    await page.keyboard.up('Shift');
                }
            }

            // Send the message
            await page.keyboard.press('Enter');
            console.log('Message sent');
            await page.waitForTimeout(3000);

            return {
                success: true,
                message: `Successfully sent message to ${username}`
            };

        } catch (error) {
            console.error('Error in sendMessage:', error);
            return {
                success: false,
                message: `Failed to send message to ${username}: ${error.message}`
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

module.exports = new InstagramService();