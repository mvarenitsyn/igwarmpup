# Instagram Automation API

A Node.js REST API for Instagram automation, including story interactions.

## Deployment

This project can be deployed in two ways:

1. [Deploy to GitHub](GITHUB_SETUP.md) - Instructions for pushing this project to GitHub
2. [Deploy to Railway](RAILWAY_DEPLOYMENT.md) - Guide for deploying to Railway platform

## Features

- Like Instagram stories with emoji reactions
- Like Instagram posts using Puppeteer
- Post comments on Instagram posts
- Support for local browser or Browserless.com
- Headless mode support
- Custom emoji options

## Prerequisites

- Node.js 14+ and npm
- Instagram account cookies (in JSON format)

## Installation

1. Clone the repository
2. Navigate to the project directory:
   ```
   cd igwarmpup
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Running the Server

```
npm run dev
```

This will start the server in development mode on port 3002 (default, as specified in the .env file) or the port specified in the environment variable.

## API Endpoints

### Like a Story

**POST** `/api/instagram/like-story`

This endpoint interacts with an Instagram story by sending an emoji reaction.

### Fetch Newest Post

**POST** `/api/instagram/newest-post`

This endpoint fetches the newest post from a specific Instagram user.

### Like a Post

**POST** `/api/instagram/like-post`

This endpoint likes a specific Instagram post using Puppeteer.

### Post a Comment

**POST** `/api/instagram/post-comment`

This endpoint posts a comment on a specific Instagram post and also likes the post.

#### Request Parameters for Like Story

| Field           | Type   | Required | Description                                           |
|-----------------|--------|----------|-------------------------------------------------------|
| username        | string | Yes      | Instagram username whose story to interact with       |
| cookie          | file   | Yes      | Instagram cookie.json file                            |
| browserless     | string | No       | Whether to use browserless.com ('true'/'false')      |
| browserlessToken| string | No       | Browserless.com API token                             |
| headless        | string | No       | Whether to run in headless mode ('true'/'false')      |
| emojis          | string | No       | JSON array of emoji strings (e.g. '["🔥","👍","❤️"]') |

#### Request Parameters for Fetch Newest Post

| Field           | Type   | Required | Description                                           |
|-----------------|--------|----------|-------------------------------------------------------|
| username        | string | Yes      | Instagram username to fetch the newest post from      |
| cookie          | file   | Yes      | Instagram cookie.json file                            |
| browserless     | string | No       | Whether to use browserless.com ('true'/'false')      |
| browserlessToken| string | No       | Browserless.com API token                             |
| headless        | string | No       | Whether to run in headless mode ('true'/'false')      |

#### Request Parameters for Like Post

| Field           | Type   | Required | Description                                           |
|-----------------|--------|----------|-------------------------------------------------------|
| postUrl         | string | Yes      | URL of the Instagram post to like                     |
| cookie          | file   | Yes      | Instagram cookie.json file                            |
| browserless     | string | No       | Whether to use browserless.com ('true'/'false')      |
| browserlessToken| string | No       | Browserless.com API token                             |
| headless        | string | No       | Whether to run in headless mode ('true'/'false')      |

#### Request Parameters for Post Comment

| Field           | Type   | Required | Description                                           |
|-----------------|--------|----------|-------------------------------------------------------|
| postUrl         | string | Yes      | URL of the Instagram post to comment on               |
| comment         | string | Yes      | Text of the comment to post                           |
| username        | string | Yes      | Instagram username of the post owner                  |
| postId          | string | No       | Optional ID of the post for comment logging           |
| cookie          | file   | Yes      | Instagram cookie.json file                            |
| browserless     | string | No       | Whether to use browserless.com ('true'/'false')      |
| browserlessToken| string | No       | Browserless.com API token                             |
| headless        | string | No       | Whether to run in headless mode ('true'/'false')      |

#### Example Request Using cURL for Like Story

```bash
curl -X POST http://localhost:3002/api/instagram/like-story \
  -F "username=iflowbot" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=false" \
  -F "headless=true" \
  -F "emojis=[\"🔥\",\"👏\",\"👍\",\"❤️\"]"
```

#### Example Response for Like Story

```json
{
  "success": true,
  "message": "Successfully sent reaction 🔥 to target_username's story",
  "emoji": "🔥",
  "username": "target_username"
}
```

#### Example Request Using cURL for Fetch Newest Post

```bash
curl -X POST http://localhost:3002/api/instagram/newest-post \
  -F "username=iflowbot" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=false" \
  -F "headless=true"
```

#### Example Response for Fetch Newest Post

```json
{
  "success": true,
  "message": "Successfully fetched newest post for target_username",
  "username": "target_username",
  "post": {
    "postUrl": "https://www.instagram.com/p/ABC123def456/",
    "postCode": "ABC123def456",
    "caption": "This is an example post caption #instagram",
    "type": "image",
    "mediaUrl": "https://scontent.cdninstagram.com/example/image.jpg",
    "timestamp": "2025-05-03T22:45:00.000Z"
  }
}
```

#### Example Request Using cURL for Like Post

```bash
curl -X POST http://localhost:3002/api/instagram/like-post \
  -F "postUrl=https://www.instagram.com/p/ABC123def456/" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=false" \
  -F "headless=true"
```

#### Example Request Using cURL for Like Post with Browserless.com

```bash
curl -X POST http://localhost:3002/api/instagram/like-post \
  -F "postUrl=https://www.instagram.com/p/ABC123def456/" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=true" \
  -F "browserlessToken=your-browserless-token"
```

#### Example Response for Like Post

```json
{
  "success": true,
  "message": "Post liked successfully",
  "postUrl": "https://www.instagram.com/p/ABC123def456/"
}
```

#### Example Request Using cURL for Post Comment

```bash
curl -X POST http://localhost:3002/api/instagram/post-comment \
  -F "postUrl=https://www.instagram.com/p/ABC123def456/" \
  -F "comment=This is a great post! 👍" \
  -F "username=target_username" \
  -F "postId=ABC123def456" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=false" \
  -F "headless=true"
```

#### Example Request Using cURL for Post Comment with Browserless.com

```bash
curl -X POST http://localhost:3002/api/instagram/post-comment \
  -F "postUrl=https://www.instagram.com/p/ABC123def456/" \
  -F "comment=This is a great post! 👍" \
  -F "username=target_username" \
  -F "postId=ABC123def456" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=true" \
  -F "browserlessToken=your-browserless-token"
```

#### Example Response for Post Comment

```json
{
  "success": true,
  "message": "Comment posted successfully",
  "postUrl": "https://www.instagram.com/p/ABC123def456/",
  "username": "target_username"
}
```

## Browserless Integration

This API supports using Browserless.com for cloud-based browser automation. To use this feature:

1. Sign up for a Browserless.com account
2. Get your API token
3. Pass it in the API request with `browserless=true` and `browserlessToken=your_token`

If browserless is not enabled, the API will use a local headless browser instance.

## Notes

- The API automatically creates necessary directories for logs and uploads
- By default, it runs in headless mode locally
- Cookie files are automatically deleted after processing for security
- Activity logs are stored in the `logs` directory

## License

ISC

## Contributing

Interested in contributing? Check out our [contribution guidelines](CONTRIBUTING.md).
