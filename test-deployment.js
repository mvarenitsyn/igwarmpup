/**
 * Deployment Test Script
 * 
 * This script tests if the igwarmpup API is running correctly 
 * by making a request to the root endpoint.
 * 
 * Usage: 
 * - For local testing: node test-deployment.js
 * - For deployed testing: node test-deployment.js https://your-railway-url.up.railway.app
 */

const axios = require('axios');

// Get the URL from command line argument or use default local URL
const baseUrl = process.argv[2] || 'http://localhost:3002';

console.log(`Testing API at: ${baseUrl}`);

// Test the root endpoint
axios.get(baseUrl)
    .then(response => {
        console.log('API Status: ✅ SUCCESS');
        console.log('API Response:');
        console.log(JSON.stringify(response.data, null, 2));

        // Check if all expected endpoints are listed
        const endpoints = response.data.endpoints;
        if (endpoints) {
            console.log('\nEndpoints check:');

            const requiredEndpoints = [
                'likeStory',
                'newestPost',
                'likePost',
                'postComment'
            ];

            let allEndpointsPresent = true;

            requiredEndpoints.forEach(endpoint => {
                if (endpoints[endpoint]) {
                    console.log(`✅ ${endpoint}: ${endpoints[endpoint]}`);
                } else {
                    console.log(`❌ ${endpoint}: Missing`);
                    allEndpointsPresent = false;
                }
            });

            if (allEndpointsPresent) {
                console.log('\n✅ All endpoints are available. Deployment looks good!');
            } else {
                console.log('\n⚠️ Some endpoints are missing. Please check your deployment.');
            }
        }
    })
    .catch(error => {
        console.log('API Status: ❌ FAILED');
        console.error('Error details:');

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`Status code: ${error.response.status}`);
            console.error('Response:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received. The API server might be down or unreachable.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', error.message);
        }

        console.log('\nTroubleshooting tips:');
        console.log('1. Make sure the API server is running');
        console.log('2. Check if the URL is correct');
        console.log('3. Verify network connectivity');
        console.log('4. Check server logs for errors');

        process.exit(1);
    });
