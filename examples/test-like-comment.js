/**
 * Example script to demonstrate the like-post and post-comment API endpoints
 * 
 * This example shows how to:
 * 1. Like a specific Instagram post
 * 2. Post a comment on an Instagram post
 * 
 * Usage:
 * - Update the COOKIE_PATH constant to point to your Instagram cookie file
 * - Update the POST_URL and USERNAME constants with your target
 * - Run with: node test-like-comment.js
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration

const API_URL = 'http://localhost:3002/api/instagram';
const COOKIE_PATH = path.resolve('./igcookie.json'); // Path to your Instagram cookie file
const POST_URL = 'https://www.instagram.com/p/DJPwqFuM0iQ/'; // Replace with actual post URL
const USERNAME = 'iflowbot'; // Replace with the username of the post owner
const COMMENT_TEXT = 'WoW! Great post! 🔥';
const USE_BROWSERLESS = false; // Set to true to use browserless.com
const BROWSERLESS_TOKEN = 'S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01'; // Your browserless.com API token

// Ensure cookie file exists
if (!fs.existsSync(COOKIE_PATH)) {
    console.error(`Cookie file not found at ${COOKIE_PATH}`);
    process.exit(1);
}

/**
 * Like a post using the API
 */
async function likePost() {
    console.log(`\n🔹 Liking post: ${POST_URL}`);

    try {
        const formData = new FormData();
        formData.append('postUrl', POST_URL);
        formData.append('cookie', fs.createReadStream(COOKIE_PATH));
        formData.append('headless', 'false');

        // Add browserless configuration if enabled
        if (USE_BROWSERLESS) {
            formData.append('browserless', 'false');
            formData.append('browserlessToken', BROWSERLESS_TOKEN);
        } else {
            formData.append('browserless', 'false');
        }

        const response = await axios.post(`${API_URL}/like-post`, formData, {
            headers: formData.getHeaders()
        });

        console.log('✅ Success:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Post a comment on a post using the API
 */
async function postComment() {
    console.log(`\n🔹 Posting comment on: ${POST_URL}`);

    try {
        const formData = new FormData();
        formData.append('postUrl', POST_URL);
        formData.append('comment', COMMENT_TEXT);
        formData.append('username', USERNAME);
        formData.append('postId', POST_URL.split('/p/')[1].replace(/\//g, '')); // Extract post ID from URL
        formData.append('cookie', fs.createReadStream(COOKIE_PATH));
        formData.append('headless', 'false');

        // Add browserless configuration if enabled
        if (USE_BROWSERLESS) {
            formData.append('browserless', 'true');
            formData.append('browserlessToken', BROWSERLESS_TOKEN);
        } else {
            formData.append('browserless', 'false');
        }

        const response = await axios.post(`${API_URL}/post-comment`, formData, {
            headers: formData.getHeaders()
        });

        console.log('✅ Success:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Run the demo
 */
async function runDemo() {
    console.log('🚀 Starting Instagram API demo for like post and post comment');
    console.log(`Using ${USE_BROWSERLESS ? 'Browserless.com' : 'local browser'} for automation`);

    try {
        // Like the post
        await likePost();

        // Add a short delay between operations
        console.log('\n⏳ Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Post a comment
        await postComment();

        console.log('\n✨ Demo completed successfully!');
    } catch (error) {
        console.error('\n❌ Demo failed');
    }
}

// Run the demo
runDemo();
