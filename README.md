Whoop Dashboard
A personal dashboard to visualize your Whoop fitness data using GitHub Pages.
Overview
This project creates a personal dashboard for your Whoop fitness data. It uses GitHub Actions to periodically fetch data from the Whoop API, store it in your repository, and display it on a React-based dashboard hosted on GitHub Pages.
Setup Instructions
1. Creating a Whoop Developer Application

Go to the Whoop Developer Portal
Create a new application
Set the redirect URI to: https://[your-github-username].github.io/whoop-dashboard/callback.html
Copy your Client ID and Client Secret

2. Setting up GitHub Secrets
Add the following secrets to your GitHub repository:

WHOOP_CLIENT_ID: Your Whoop application client ID
WHOOP_CLIENT_SECRET: Your Whoop application client secret
WHOOP_REFRESH_TOKEN: You'll get this in a later step

3. Getting Authorization and Refresh Token

Clone this repository to your local machine
Install dependencies: npm install
Set the client ID as an environment variable:
export WHOOP_CLIENT_ID=your_client_id

Run the setup script:
node scripts/setup.js

Follow the instructions provided by the script
After you've obtained the refresh token, add it to your GitHub repository secrets as WHOOP_REFRESH_TOKEN

4. Deploy to GitHub Pages

Run npm run deploy to deploy the dashboard to GitHub Pages
Visit https://[your-github-username].github.io/whoop-dashboard/ to see your dashboard

The GitHub Action will automatically fetch new data every 6 hours or you can trigger it manually from the Actions tab in your repository.
Troubleshooting
API Errors
If you see error messages in your data file:

Check that your secrets are correctly set in GitHub
Verify that your Whoop application is properly configured
Try getting a new refresh token following step 3 again
Check the GitHub Action logs for more detailed error information

Dashboard Errors
If your dashboard isn't displaying properly:

Make sure the GitHub Pages site is published (check repository settings)
Verify that the data file exists in the data directory
Check browser console for JavaScript errors

Development

npm start: Run the dashboard locally
npm run build: Build the dashboard for production
npm run deploy: Deploy the dashboard to GitHub Pages

Privacy
This dashboard runs entirely on GitHub Pages and your data is stored in your own GitHub repository. No data is sent to any third-party services beyond the official Whoop API.