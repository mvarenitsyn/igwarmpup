const { IgApiClient } = require('instagram-private-api');
const fs = require('fs');
const path = require('path');
const tough = require('tough-cookie');

/**
 * Load cookies from a JSON file and return a serialized tough-cookie jar
 * @param {string} cookiesPath
 * @returns {Object} serialized cookie jar
 */
function loadCookies(cookiesPath) {
    try {
        const cookiesString = fs.readFileSync(cookiesPath, 'utf8');
        const cookies = JSON.parse(cookiesString);

        // Transform cookies into tough-cookie format
        const cookieJar = new tough.CookieJar();
        cookies.forEach(cookie => {
            cookieJar.setCookieSync(
                new tough.Cookie({
                    key: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    expires: cookie.expires ? new Date(cookie.expires) : 'Infinity',
                }).toString(),
                `https://${cookie.domain}`
            );
        });

        return cookieJar.serializeSync();
    } catch (error) {
        console.error(`Error loading cookies from ${cookiesPath}:`, error);
        process.exit(1);
    }
}

/**
 * Fetch the newest post of an Instagram user using Instagram Private API
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Result of the operation
 */
const fetchNewestPostWithPrivateApi = async (options) => {
    const {
        username,
        cookiesPath,
    } = options;

    let result = {
        success: false,
        message: '',
        post: null
    };

    try {
        // Initialize Instagram API client
        const ig = new IgApiClient();
        ig.state.generateDevice(username);

        // Use loadCookies to get a serialized cookie jar and apply it
        try {
            const serializedCookieJar = loadCookies(cookiesPath);
            await ig.state.deserializeCookieJar(JSON.stringify(serializedCookieJar));
            await ig.account.currentUser();
        } catch (cookieError) {
            throw new Error(`Failed to apply cookies: ${cookieError.message}`);
        }

        // Search for the target user
        const searchResult = await ig.user.searchExact(username);
        if (!searchResult) {
            const message = `User ${username} not found`;
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

        result.success = true;
        result.message = `Successfully fetched newest post for ${username}`;
        result.post = postInfo;

        return result;
    } catch (error) {
        result.message = `Error: ${error.message}`;
        return result;
    }
};

module.exports = {
    fetchNewestPostWithPrivateApi
};
