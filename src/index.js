require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import routes
const instagramRoutes = require('./routes/instagram.routes');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3002;

// Create necessary directories
const uploadsDir = path.join(__dirname, '../uploads');
const logsDir = path.join(__dirname, '../logs');

// Ensure directories exist
[uploadsDir, logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/instagram', instagramRoutes);

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to Instagram Automation API',
        version: require('../package.json').version,
        endpoints: {
            likeStory: '/api/instagram/like-story',
            newestPost: '/api/instagram/newest-post',
            likePost: '/api/instagram/like-post',
            postComment: '/api/instagram/post-comment'
        },
        documentation: 'See README.md for detailed usage information'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
