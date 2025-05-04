const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const config = {
    apiEndpoint: 'http://localhost:3002/api/instagram/newest-post',
    username: 'nike', // Try another popular account with many posts
    cookiePath: path.join(__dirname, '../igcookie.json'), // Path to your cookies file
    browserless: false,
    browserlessToken: '', // Your browserless token if using browserless
    headless: true
};

/**
 * Send a request to fetch the newest post
 */
async function fetchNewestPost() {
    try {
        // Check if cookie file exists
        if (!fs.existsSync(config.cookiePath)) {
            console.error(`Cookie file not found: ${config.cookiePath}`);
            return;
        }

        // Create form data
        const formData = new FormData();
        formData.append('username', config.username);
        formData.append('cookie', fs.createReadStream(config.cookiePath));
        formData.append('browserless', config.browserless.toString());

        if (config.browserless && config.browserlessToken) {
            formData.append('browserlessToken', config.browserlessToken);
        }

        formData.append('headless', config.headless.toString());

        console.log(`Sending request to fetch newest post for user: ${config.username}`);
        console.log('API Endpoint:', config.apiEndpoint);

        // Send POST request
        const response = await axios.post(config.apiEndpoint, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log('Response:', JSON.stringify(response.data, null, 2));

        // If successful, display the post information
        if (response.data.success && response.data.post) {
            const post = response.data.post;
            console.log('\nPost Details:');
            console.log('--------------');
            console.log('Post URL:', post.postUrl);
            console.log('Post Code:', post.postCode);
            console.log('Type:', post.type);
            console.log('Caption:', post.caption);
            if (post.mediaUrl) {
                console.log('Media URL:', post.mediaUrl);
            }
            console.log('Timestamp:', post.timestamp);
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
    }
}

// Run the function
fetchNewestPost();
