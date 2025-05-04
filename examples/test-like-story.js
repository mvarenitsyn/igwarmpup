const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Configuration
const config = {
    apiEndpoint: 'http://localhost:3002/api/instagram/like-story',
    username: 'vary.miami', // Target username from target.txt
    cookiePath: path.join(__dirname, '../igcookie.json'), // Path to your cookies file
    browserless: true,
    browserlessToken: 'S8yf0Lo56GNr1m2a9c480cc39f66c2f90362fe9d01', // Your browserless token if using browserless
    headless: true,
    emojis: ['🔥', '👏', '👍', '❤️']
};

/**
 * Send a request to like a story
 */
async function likeStory() {
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
        formData.append('emojis', JSON.stringify(config.emojis));

        console.log(`Sending request to like story for user: ${config.username}`);

        // Send POST request
        const response = await axios.post(config.apiEndpoint, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

// Run the function
likeStory();
