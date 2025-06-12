const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');
const Job = require('../models/Job');
const User = require('../models/User');
const instagramService = require('./instagram.playwright');

const jobEmitter = new EventEmitter();
const MAX_CONCURRENT_JOBS = 3;

let activeJobs = 0;
let isProcessing = false;

async function processQueue() {
    if (isProcessing || activeJobs >= MAX_CONCURRENT_JOBS) {
        return;
    }

    isProcessing = true;

    try {
        const job = await Job.findOne({ status: 'queued' })
            .sort({ created: 1 })
            .exec();

        if (job && activeJobs < MAX_CONCURRENT_JOBS) {
            activeJobs++;

            processJob(job).finally(() => {
                activeJobs--;
                setTimeout(processQueue, 100);
            });

            setImmediate(processQueue);
        }
    } catch (error) {
        console.error('Error processing queue:', error);
    } finally {
        isProcessing = false;
    }
}

async function processJob(job) {
    try {
        console.log(`Processing ${job.type} job: ${job.jobId}`);

        job.status = 'in-progress';
        await job.save();

        if (job.type === 'similar-accounts') {
            await processSimilarAccountsJob(job);
        } else if (job.type === 'follow') {
            await processFollowJob(job);
        } else if (job.type === 'send-message') {
            await processSendMessageJob(job);
        } else {
            throw new Error(`Unknown job type: ${job.type}`);
        }

        jobEmitter.emit('job-completed', job.jobId);
        return { success: true };
    } catch (error) {
        console.error(`Error processing job ${job.jobId}:`, error);

        job.status = 'failed';
        job.error = error.message;
        await job.save();

        jobEmitter.emit('job-failed', job.jobId, error);
        throw error;
    }
}

async function processSimilarAccountsJob(job) {
    try {
        const jobData = await Job.findOne({ jobId: job.jobId }).select('+cookieData');

        if (!jobData) {
            throw new Error(`Job ${job.jobId} not found`);
        }

        const { targetUsername } = jobData;
        const options = { ...jobData.browserOptions || {} };

        if (jobData.browserless && jobData.browserless.enabled) {
            options.browserless = jobData.browserless;
        }

        const { cookieData } = jobData;

        if (!cookieData) {
            throw new Error('Cookie data not found for job');
        }

        options.pageDelay = options.pageDelay || 3000;

        console.log(`Starting similar accounts job: ${job.jobId} for username: ${targetUsername}`);

        const similarAccounts = await instagramService.getSimilarAccounts(
            targetUsername,
            Buffer.from(cookieData, 'base64'),
            options
        );

        jobData.status = 'completed';
        jobData.results = similarAccounts;
        jobData.completedAt = new Date();
        jobData.executionTime = jobData.completedAt - new Date(jobData.created);
        await jobData.save();

        await User.findOneAndUpdate(
            { username: targetUsername },
            {
                $set: {
                    similarAccounts,
                    lastProcessed: new Date(),
                    accountCount: similarAccounts.length
                },
                $addToSet: { jobIds: job.jobId }
            },
            { upsert: true, new: true }
        );

        console.log(`Job ${job.jobId} completed successfully with ${similarAccounts.length} results`);
        return {
            success: true,
            count: similarAccounts.length,
            executionTime: jobData.executionTime
        };
    } catch (error) {
        console.error(`Error processing job ${job.jobId}:`, error);
        throw error;
    }
}

async function processFollowJob(job) {
    try {
        const jobData = await Job.findOne({ jobId: job.jobId }).select('+cookieData');

        if (!jobData) {
            throw new Error(`Job ${job.jobId} not found`);
        }

        const { targetUsername } = jobData;
        const options = { ...jobData.browserOptions || {} };

        if (jobData.browserless && jobData.browserless.enabled) {
            options.browserless = jobData.browserless;
        }

        const { cookieData } = jobData;

        if (!cookieData) {
            throw new Error('Cookie data not found for job');
        }

        options.pageDelay = options.pageDelay || 3000;

        console.log(`Starting follow job: ${job.jobId} for username: ${targetUsername}`);

        const result = await instagramService.followUser(
            targetUsername,
            Buffer.from(cookieData, 'base64'),
            options
        );

        jobData.status = 'completed';
        jobData.results = [{
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString()
        }];
        jobData.completedAt = new Date();
        jobData.executionTime = jobData.completedAt - new Date(jobData.created);
        await jobData.save();

        try {
            await User.findOneAndUpdate(
                { username: targetUsername },
                {
                    $set: {
                        lastFollow: {
                            success: result.success,
                            date: new Date(),
                            message: result.message
                        }
                    },
                    $addToSet: { jobIds: job.jobId }
                },
                { upsert: true }
            );
        } catch (userUpdateError) {
            console.log(`User record update warning: ${userUpdateError.message}`);
        }

        console.log(`Follow job ${job.jobId} completed with result:`, result);
        return {
            success: result.success,
            followed: result.success,
            message: result.message,
            executionTime: jobData.executionTime
        };
    } catch (error) {
        console.error(`Error processing follow job ${job.jobId}:`, error);
        throw error;
    }
}

async function processSendMessageJob(job) {
    try {
        const jobData = await Job.findOne({ jobId: job.jobId }).select('+cookieData');

        if (!jobData) {
            throw new Error(`Job ${job.jobId} not found`);
        }

        const { targetUsername, messageContent } = jobData;
        const options = { ...jobData.browserOptions || {} };

        if (jobData.browserless && jobData.browserless.enabled) {
            options.browserless = jobData.browserless;
        }

        const { cookieData } = jobData;

        if (!cookieData) {
            throw new Error('Cookie data not found for job');
        }

        if (!messageContent) {
            throw new Error('Message content not found for job');
        }

        options.pageDelay = options.pageDelay || 3000;

        console.log(`Starting send message job: ${job.jobId} for username: ${targetUsername}`);

        const result = await instagramService.sendMessage(
            targetUsername,
            messageContent,
            Buffer.from(cookieData, 'base64'),
            options
        );

        jobData.status = 'completed';
        jobData.results = [{
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString()
        }];
        jobData.completedAt = new Date();
        jobData.executionTime = jobData.completedAt - new Date(jobData.created);
        await jobData.save();

        try {
            await User.findOneAndUpdate(
                { username: targetUsername },
                {
                    $set: {
                        lastMessage: {
                            success: result.success,
                            date: new Date(),
                            message: result.message,
                            content: messageContent
                        }
                    },
                    $addToSet: { jobIds: job.jobId }
                },
                { upsert: true }
            );
        } catch (userUpdateError) {
            console.log(`User record update warning: ${userUpdateError.message}`);
        }

        console.log(`Send message job ${job.jobId} completed with result:`, result);
        return {
            success: result.success,
            messageSent: result.success,
            message: result.message,
            executionTime: jobData.executionTime
        };
    } catch (error) {
        console.error(`Error processing send message job ${job.jobId}:`, error);
        throw error;
    }
}

async function addSimilarAccountsJob(targetUsername, cookieData, options = {}) {
    const jobId = uuidv4();

    console.log(`Creating similar accounts job with options:`, JSON.stringify(options, null, 2));

    const job = new Job({
        jobId,
        type: 'similar-accounts',
        targetUsername,
        status: 'queued',
        browserless: options.browserless || null,
        browserOptions: options,
        cookieData: cookieData
    });

    await job.save();
    setTimeout(processQueue, 0);
    return jobId;
}

async function addFollowJob(targetUsername, cookieData, options = {}) {
    const jobId = uuidv4();

    console.log(`Creating follow job with options:`, JSON.stringify(options, null, 2));

    const job = new Job({
        jobId,
        type: 'follow',
        targetUsername,
        status: 'queued',
        browserless: options.browserless || null,
        browserOptions: options,
        cookieData: cookieData
    });

    await job.save();
    setTimeout(processQueue, 0);
    return jobId;
}

async function addSendMessageJob(targetUsername, message, cookieData, options = {}) {
    const jobId = uuidv4();

    console.log(`Creating send message job with options:`, JSON.stringify(options, null, 2));

    const job = new Job({
        jobId,
        type: 'send-message',
        targetUsername,
        status: 'queued',
        browserless: options.browserless || null,
        browserOptions: options,
        cookieData: cookieData,
        messageContent: message
    });

    await job.save();
    setTimeout(processQueue, 0);
    return jobId;
}

async function getJob(jobId) {
    const job = await Job.findOne({ jobId });
    if (!job) {
        throw new Error('Job not found');
    }
    return job;
}

jobEmitter.on('error', (error) => {
    console.error('Job error:', error);
});

setTimeout(processQueue, 1000);

module.exports = {
    addSimilarAccountsJob,
    addFollowJob,
    addSendMessageJob,
    getJob
};