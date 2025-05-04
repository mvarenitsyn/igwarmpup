# Deploying igwarmpup to Railway

This guide will walk you through deploying the igwarmpup API to [Railway](https://railway.app/).

## Prerequisites

1. A [Railway](https://railway.app/) account
2. Git installed on your local machine
3. A GitHub repository with your igwarmpup code

## Deployment Steps

### 1. Prepare Your Project

Ensure your project has the following files:
- `Procfile` (should contain `web: node src/index.js`)
- `.env.example` (as a template for required environment variables)
- Make sure your `package.json` has the correct start script: `"start": "node src/index.js"`

### 2. Push Your Code to GitHub

If you haven't already, push your project to GitHub:

```bash
# Initialize git if you haven't already
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit for railway deployment"

# Add your GitHub repository as a remote
git remote add origin https://github.com/your-username/igwarmpup.git

# Push to GitHub
git push -u origin main
```

### 3. Connect Railway to GitHub

1. Log in to your [Railway](https://railway.app/) account
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select your igwarmpup repository

### 4. Configure Environment Variables

In the Railway dashboard for your project:

1. Navigate to the "Variables" tab
2. Add the following environment variables:
   - `PORT`: Railway will provide a port, but you can set it to `3002` (it will be overridden)
   - `NODE_ENV`: Set to `production`
   - `BROWSERLESS_TOKEN`: Your Browserless.com API token (if you're using Browserless)
   - Add any other environment variables your application needs

### 5. Configure Project Settings

In the "Settings" tab:

1. Set the root directory if your app isn't in the root of the repo
2. Set the "Start Command" to `npm start` (should match your Procfile)

### 6. Deploy Your Project

1. Go to the "Deployments" tab
2. If Railway hasn't automatically deployed your project, click "Deploy Now"
3. Wait for the deployment to complete
4. Once deployed, Railway will provide you with a URL to access your API

### 7. Testing Your Deployment

Test your deployed API using one of the example API calls from the README:

```bash
curl -X POST https://your-railway-url.up.railway.app/api/instagram/newest-post \
  -F "username=username_to_check" \
  -F "cookie=@./igcookie.json" \
  -F "browserless=true" \
  -F "browserlessToken=your-browserless-token"
```

Note: You'll need to adjust the request to work with your deployed API.

### 8. Continuous Deployment

Railway automatically sets up continuous deployment. Any push to your GitHub repository's main branch will trigger a new deployment.

## Considerations for Railway Deployment

1. **Puppeteer in Railway**: Railway supports headless browsers, but you may need to use the browserless.com option for better reliability.

2. **File Storage**: Railway's filesystem is ephemeral, meaning files uploaded to the server will be lost on redeployment. Consider using a service like AWS S3 for persistent file storage if needed.

3. **Memory Usage**: Be mindful of memory usage, especially when running Puppeteer. Railway provides monitoring tools to help you keep track of your app's resource usage.

4. **Environment Variables**: Never commit sensitive data like API tokens or cookies to your repository. Always use environment variables.

5. **Logging**: Railway provides logging capabilities. You can view your application logs in the Railway dashboard.

## Troubleshooting

If you encounter issues with your deployment:

1. Check the deployment logs in Railway
2. Ensure all required environment variables are set
3. Verify that your application works locally before deploying
4. Check if your application is correctly binding to the PORT environment variable

For additional help, refer to the [Railway documentation](https://docs.railway.app/) or open an issue in the igwarmpup GitHub repository.
