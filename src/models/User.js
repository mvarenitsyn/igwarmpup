const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    similarAccounts: {
        type: [String],
        default: []
    },
    accountCount: {
        type: Number,
        default: 0
    },
    lastProcessed: {
        type: Date,
        default: null
    },
    lastFollow: {
        success: Boolean,
        date: Date,
        message: String
    },
    jobIds: {
        type: [String],
        default: []
    },
    created: {
        type: Date,
        default: Date.now
    },
    updated: {
        type: Date,
        default: Date.now
    }
});

UserSchema.pre('save', function (next) {
    this.updated = Date.now();
    next();
});

module.exports = mongoose.model('User', UserSchema);