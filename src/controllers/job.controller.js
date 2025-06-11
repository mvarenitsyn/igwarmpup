const queueService = require('../services/queue');
const Job = require('../models/Job');

const getJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!jobId) {
            return res.status(400).json({
                error: 'Job ID is required',
                status: 'error',
                code: 'MISSING_JOB_ID'
            });
        }

        const job = await queueService.getJob(jobId);
        
        return res.status(200).json({
            jobId: job.jobId,
            type: job.type,
            targetUsername: job.targetUsername,
            status: job.status,
            results: job.results,
            error: job.error,
            created: job.created,
            updated: job.updated,
            completedAt: job.completedAt,
            executionTime: job.executionTime
        });
    } catch (error) {
        if (error.message === 'Job not found') {
            return res.status(404).json({
                error: 'Job not found',
                status: 'error',
                code: 'JOB_NOT_FOUND'
            });
        }

        console.error('Error getting job status:', error);
        return res.status(500).json({
            error: error.message || 'Server error',
            status: 'error',
            code: 'SERVER_ERROR'
        });
    }
};

const getUserJobs = async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({
                error: 'Username is required',
                status: 'error',
                code: 'MISSING_USERNAME'
            });
        }

        const jobs = await Job.find({ targetUsername: username })
            .sort({ created: -1 })
            .exec();

        const jobSummaries = jobs.map(job => ({
            jobId: job.jobId,
            type: job.type,
            targetUsername: job.targetUsername,
            status: job.status,
            results: job.results,
            error: job.error,
            created: job.created,
            updated: job.updated,
            completedAt: job.completedAt,
            executionTime: job.executionTime
        }));

        return res.status(200).json(jobSummaries);
    } catch (error) {
        console.error('Error getting user jobs:', error);
        return res.status(500).json({
            error: error.message || 'Server error',
            status: 'error',
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    getJobStatus,
    getUserJobs
};