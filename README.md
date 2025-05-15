# Whoop Dashboard

A personal dashboard to visualize your Whoop fitness data using GitHub Pages.

## Overview

This project creates a personal dashboard for your Whoop fitness data. It uses GitHub Actions to periodically fetch data from the Whoop API, store it in your repository, and display it on a React-based dashboard hosted on GitHub Pages.

## Setup Instructions

### 1. Create a Whoop Developer Application

1. Go to the [Whoop Developer Portal](https://developer.whoop.com/dashboard)
2. Sign in with your Whoop account
3. Create a new application
4. Set the redirect URI to: `https://[your-github-username].github.io/whoop-dashboard/callback.html`
5. Request these scopes: `offline read:profile read:recovery read:cycles read:sleep read:workout`
6. Copy your Client ID and Client Secret

### 2. Set up GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add the following repository secrets:
   - `WHOOP_CLIENT_ID`: Your Whoop application client ID
   - `WHOOP_CLIENT_SECRET`: Your Whoop application client secret
   - `WHOOP_REFRESH_TOKEN`: You'll get this in a later step

### 3. Get Authorization and Refresh Token

There are two ways to get your initial refresh token:

#### Option 1: Using the setup script (Recommended)

1. Clone this repository to your local machine
2. Install dependencies: `npm install axios`
3. Set the client ID as an environment variable:
   ```
   export WHOOP_CLIENT_ID=your_client_id
   ```
4. Run the setup script:
   ```
   node scripts/setup.js
   ```
5. Follow the instructions provided by the script
   - Visit the authorization URL
   - Log in and approve the access request
   - Copy the authorization code from the callback URL
   - Use the provided cURL command to exchange the code for tokens
   - Copy the refresh_token value from the response
6. Add the refresh token to your GitHub repository secrets as `WHOOP_REFRESH_TOKEN`

#### Option 2: Using the token utility

1. Clone this repository to your local machine
2. Install dependencies: `npm install axios`
3. Run the token utility script:
   ```
   node scripts/token-util.js
   ```
4. Choose option 2 to exchange an authorization code for tokens
5. Follow the prompts, providing your client ID, client secret, and the authorization code
6. Copy the refresh token from the output and add it to your GitHub secrets

### 4. Deploy to GitHub Pages

1. In your GitHub repository, go to Settings → Pages
2. Set the source to "GitHub Actions"
3. Run `npm run deploy` locally or trigger the GitHub Action manually
4. Visit `https://[your-github-username].github.io/whoop-dashboard/` to see your dashboard

The GitHub Action will automatically fetch new data every 6 hours or you can trigger it manually from the Actions tab in your repository.

## Test and Manage Your Tokens

You can use the token utility script to test if your refresh token is still valid:

```
export WHOOP_CLIENT_ID=your_client_id
export WHOOP_CLIENT_SECRET=your_client_secret
export WHOOP_REFRESH_TOKEN=your_refresh_token
node scripts/token-util.js
```

Choose option 1 to test your existing refresh token. If a new refresh token is issued, update your GitHub secret with the new value.

## Troubleshooting

### API Errors

If you see error messages in your data file:

1. Check that your secrets are correctly set in GitHub
2. Verify that your Whoop application is properly configured
3. Test your refresh token using the token utility script
4. Check the GitHub Action logs for more detailed error information

### Dashboard Errors

If your dashboard isn't displaying properly:

1. Make sure the GitHub Pages site is published (check repository settings)
2. Verify that the data file exists in the `data` directory
3. Check browser console for JavaScript errors

## Development

- `npm start`: Run the dashboard locally
- `npm run build`: Build the dashboard for production
- `npm run deploy`: Deploy the dashboard to GitHub Pages

## Privacy

This dashboard runs entirely on GitHub Pages and your data is stored in your own GitHub repository. No data is sent to any third-party services beyond the official Whoop API.