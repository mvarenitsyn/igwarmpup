# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs with nodemon for auto-restart)
- **Start production server**: `npm start`
- **Install dependencies**: `npm install`

## Architecture Overview

This is an Instagram automation REST API built with Express.js, Puppeteer, and Playwright for browser automation. The application provides endpoints for Instagram interactions including story liking, post automation, account discovery, and user following with asynchronous job processing.

### Core Components

- **Express Server** (`src/index.js`): Main server setup with CORS, middleware, database connection, and route registration
- **Database** (`src/config/database.js`): MongoDB connection with Mongoose for data persistence
- **Models** (`src/models/`): MongoDB schemas for jobs and user data
  - `Job.js`: Job queue schema with execution tracking
  - `User.js`: User data schema for similar accounts and follow history
- **Routes**: API endpoint definitions across multiple route files
  - `instagram.routes.js`: Instagram automation endpoints
  - `job.routes.js`: Job status and management endpoints
  - `user.routes.js`: User data retrieval endpoints
- **Controllers**: Request handling and business logic
  - `instagram.controller.js`: Instagram automation + new async job endpoints
  - `job.controller.js`: Job status tracking and retrieval
  - `user.controller.js`: User data management
- **Services**: Core automation and job processing
  - `queue.js`: Job queue management with EventEmitter
  - `instagram.playwright.js`: Playwright-based automation for new features
- **Utilities** (`src/utils/`): Legacy Puppeteer automation logic
  - `instagram.browser.api.js`: Puppeteer-based browser automation
  - `instagram.private.api.js`: Instagram Private API integration
  - `instagram.utils.js`: Story liking functionality

### Key Technical Details

- **Dual Browser Support**: Puppeteer for existing features, Playwright for new async operations
- **Job Queue System**: Asynchronous processing with MongoDB persistence and concurrent job limits (max 3)
- **File Uploads**: Uses multer for handling Instagram cookie JSON files (disk storage for existing endpoints, memory storage for new endpoints)
- **Database Integration**: MongoDB with automatic fallback - app continues without database for existing functionality
- **Cookie Management**: Base64 encoding for job storage, automatic cleanup for immediate operations
- **Logging**: Activity logs stored in `logs/` directory, execution time tracking
- **Directories**: Auto-creates `uploads/` and `logs/` directories on startup

### API Endpoints

#### Immediate Processing (Puppeteer-based)
- `POST /api/instagram/like-story`: Send emoji reactions to Instagram stories
- `POST /api/instagram/newest-post`: Fetch user's newest post using Private API
- `POST /api/instagram/like-post`: Like posts using Puppeteer automation
- `POST /api/instagram/post-comment`: Post comments and like posts simultaneously

#### Asynchronous Processing (Playwright + Job Queue)
- `POST /api/instagram/similar-accounts`: Queue job to find similar Instagram accounts
- `POST /api/instagram/follow`: Queue job to follow a user
- `POST /api/instagram/send-message`: Queue job to send direct message to a user
- `GET /api/jobs/:jobId`: Get job status and results
- `GET /api/jobs/user/:username`: Get all jobs for a specific username
- `GET /api/users/:username`: Get stored user data including similar accounts

### Configuration Options

#### Existing Endpoints Support:
- **browserless**: Toggle for cloud browser service (`'true'/'false'`)
- **browserlessToken**: API token for Browserless.com
- **headless**: Browser visibility mode (default: `true`)
- **cookie**: Required Instagram authentication JSON file

#### New Async Endpoints Support:
- **browserless**: JSON object with advanced browserless.io configuration
- **browserOptions**: JSON object with browser settings, timeouts, and debug options
- **cookieFile**: Instagram authentication JSON file (memory upload)

### Job Processing

- **Queue Management**: EventEmitter-based job processing with automatic retries
- **Concurrency Control**: Maximum 3 concurrent jobs to prevent resource exhaustion
- **Status Tracking**: Real-time job status updates (queued → in-progress → completed/failed)
- **Data Persistence**: Results stored in MongoDB with execution metadata
- **Error Handling**: Comprehensive error capture with stack traces and fallback mechanisms

### Error Handling

- **Database Resilience**: Application continues functioning if MongoDB is unavailable
- **Browser Fallbacks**: Automatic fallback from browserless.io to local browser
- **File Management**: Automatic cleanup of temporary files and cookie data
- **Validation**: Input validation for usernames, URLs, and configuration options
- **Duplicate Prevention**: Comment logging to prevent duplicate actions