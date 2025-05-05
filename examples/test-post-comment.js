/**
 * Test script for the post-comment API endpoint
 * 
 * This script tests the updated post-comment endpoint with improved URL validation
 * and error handling.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const API_URL = 'https://web-production-456c.up.railway.app/api/instagram';
const COOKIE_PATH = path.resolve(__dirname, '../../igcookie.json');
const POST_URL = 'https://www.instagram.com/p/DJPwqFuM0iQ/';
const COMMENT_TEXT = 'Great post! Testing the improved API 🚀';

async function testPostComment() {
    try {
        // Verify cookie file exists
        if (!fs.existsSync(COOKIE_PATH)) {
            console.error('Cookie file not found at:', COOKIE_PATH);
            return;
        }

        // Create form data for the API request
        const formData = new FormData();
        formData.append('cookie', fs.createReadStream(COOKIE_PATH));
        formData.append('postUrl', POST_URL);
        formData.append('comment', COMMENT_TEXT);
        formData.append('browserless', "true");
        formData.append('browserlessToken', 'S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01');

        // Optional: Add postId to prevent duplicate comments on the same post
        // formData.append('postId', 'unique-post-id-123'); 
        formData.append('headless', 'true');      // Set to false to see the browser for testing

        console.log('Sending request to post comment on:', POST_URL);
        console.log('Comment text:', COMMENT_TEXT);

        // Make the API request
        const response = await axios.post(`${API_URL}/post-comment`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        console.log('API Response:', response.data);
        console.log('Comment posted successfully!');
    } catch (error) {
        console.error('Error posting comment:');
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Server response:', error.response.data);
            console.error('Status code:', error.response.status);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from server');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Request error:', error.message);
        }
    }
}

// Run the test function
testPostComment();
