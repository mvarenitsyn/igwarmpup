const User = require('../models/User');

const getUserData = async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({
                error: 'Username is required',
                status: 'error',
                code: 'MISSING_USERNAME'
            });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                status: 'error',
                code: 'USER_NOT_FOUND'
            });
        }

        return res.status(200).json({
            username: user.username,
            similarAccounts: user.similarAccounts,
            accountCount: user.accountCount,
            lastProcessed: user.lastProcessed,
            lastFollow: user.lastFollow,
            jobIds: user.jobIds,
            created: user.created,
            updated: user.updated
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        return res.status(500).json({
            error: error.message || 'Server error',
            status: 'error',
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    getUserData
};