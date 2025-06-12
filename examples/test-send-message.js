const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration - update these values
const config = {
    apiBaseUrl: 'http://localhost:3002',
    targetUsername: 'example_user', // Instagram username to send message to
    message: 'Hello! This is a test message from the Instagram automation API.\n\nHow are you doing today?',
    cookiePath: path.join(__dirname, '../igcookie.json'), // Path to your Instagram cookie file
    browserless: {
        enabled: true,
        token: 'your_browserless_token_here', // Replace with your browserless token
        queryParams: {
            proxyCountry: "us",
            proxy: "residential",
            proxySticky: true,
            stealth: true,
            headless: true
        }
    }
};

async function testSendMessage() {
    try {
        console.log('🚀 Testing Send Message Endpoint');
        console.log(`Target: ${config.targetUsername}`);
        console.log(`Message: ${config.message}`);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('targetUsername', config.targetUsername);
        formData.append('message', config.message);
        formData.append('cookieFile', fs.createReadStream(config.cookiePath));
        
        // Add browserless configuration if enabled
        if (config.browserless.enabled) {
            formData.append('browserless', JSON.stringify(config.browserless));
        }

        console.log('\n📤 Sending request to create message job...');

        // Send POST request to create job
        const response = await axios.post(
            `${config.apiBaseUrl}/api/instagram/send-message`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );

        console.log('✅ Job created successfully!');
        console.log('Job ID:', response.data.jobId);
        console.log('Status:', response.data.status);
        console.log('Message:', response.data.message);

        // Poll for job completion
        const jobId = response.data.jobId;
        console.log('\n⏳ Polling for job completion...');

        let completed = false;
        let attempts = 0;
        const maxAttempts = 24; // 2 minutes with 5-second intervals

        while (!completed && attempts < maxAttempts) {
            attempts++;
            console.log(`Checking job status (attempt ${attempts}/${maxAttempts})...`);
            
            try {
                const statusResponse = await axios.get(
                    `${config.apiBaseUrl}/api/jobs/${jobId}`
                );

                const job = statusResponse.data;
                console.log(`Status: ${job.status}`);

                if (job.status === 'completed') {
                    completed = true;
                    console.log('\n🎉 Message sent successfully!');
                    console.log('Results:', JSON.stringify(job.results, null, 2));
                    console.log(`Execution time: ${job.executionTime}ms`);
                } else if (job.status === 'failed') {
                    completed = true;
                    console.log('\n❌ Job failed!');
                    console.log('Error:', job.error);
                } else {
                    // Wait 5 seconds before next check
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (statusError) {
                console.error('Error checking job status:', statusError.response?.data || statusError.message);
                break;
            }
        }

        if (!completed) {
            console.log('\n⏰ Job is still processing after 2 minutes');
            console.log('You can check the status later using:');
            console.log(`GET ${config.apiBaseUrl}/api/jobs/${jobId}`);
        }

    } catch (error) {
        console.error('\n❌ Error testing send message endpoint:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
testSendMessage();