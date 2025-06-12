const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        enum: ['similar-accounts', 'follow', 'send-message'],
        required: true
    },
    targetUsername: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'in-progress', 'completed', 'failed'],
        default: 'queued'
    },
    results: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    error: {
        type: String,
        default: null
    },
    errorStack: {
        type: String,
        default: null
    },
    errorAt: {
        type: Date,
        default: null
    },
    browserless: {
        enabled: Boolean,
        token: String,
        queryParams: mongoose.Schema.Types.Mixed
    },
    browserOptions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    cookieData: {
        type: String,
        select: false
    },
    messageContent: {
        type: String,
        default: null
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    executionTime: {
        type: Number,
        default: null
    },
    retryCount: {
        type: Number,
        default: 0
    },
    maxRetries: {
        type: Number,
        default: 3
    }
});

JobSchema.pre('save', function (next) {
    this.updated = Date.now();
    next();
});

module.exports = mongoose.model('Job', JobSchema);