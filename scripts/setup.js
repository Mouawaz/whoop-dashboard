const readline = require('readline');

/**
 * This script helps generate the OAuth authorization URL and guides you through
 * the process of obtaining a refresh token for the Whoop API.
 */
function generateAuthUrl() {
  // Get the client ID from environment or prompt for it
  let clientId = "9d334263-1e8f-4b33-8510-2c138662257c";
  
  if (!clientId) {
    console.error('\nERROR: WHOOP_CLIENT_ID environment variable is required.');
    console.error('Set it with: export WHOOP_CLIENT_ID=your_client_id\n');
    process.exit(1);
  }
  
  // The redirect URI - should match what you configured in your Whoop Developer Dashboard
  const redirectUri = 'https://mouawaz.github.io/whoop-dashboard/callback.html';
  
  // Define the scopes needed - include all relevant ones for our dashboard
  const scopes = [
    'offline',           // Required to get a refresh token
    'read:profile',      // Access to user profile
    'read:recovery',     // Access to recovery data
    'read:cycles',       // Access to cycle data 
    'read:sleep',        // Access to sleep data
    'read:workout'       // Access to workout data
  ].join(' ');
  
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 10);
  
  // Construct the authorization URL
  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(state)}`;
  
  console.log("\n===== Whoop API Authorization Guide =====\n");
  console.log("Follow these steps to authorize your app to access your Whoop data:\n");
  
  console.log("STEP 1: Visit this URL in your browser:");
  console.log("------------------------------------------------------------------------");
  console.log(authUrl);
  console.log("------------------------------------------------------------------------\n");
  
  console.log("STEP 2: Log in with your Whoop credentials and approve the access request");
  console.log("STEP 3: You'll be redirected to the callback page with an authorization code");
  console.log("STEP 4: Use that code to get your initial refresh token by running this cURL command:\n");
  
  console.log("------------------------------------------------------------------------");
  console.log(`curl -X POST https://api.prod.whoop.com/oauth/oauth2/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=${clientId}" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "grant_type=authorization_code" \\
  -d "code=AUTHORIZATION_CODE_FROM_STEP_3" \\
  -d "redirect_uri=${redirectUri}"`);
  console.log("------------------------------------------------------------------------\n");
  
  console.log("STEP 5: From the response, copy the refresh_token value");
  console.log("STEP 6: Add this refresh token to your GitHub repository secrets as WHOOP_REFRESH_TOKEN\n");
  
  console.log("Once complete, your GitHub Action will be able to fetch your Whoop data automatically");
  console.log("and refresh the token when needed!\n");
}

// Run the function if this script is executed directly
if (require.main === module) {
  generateAuthUrl();
}

module.exports = {
  generateAuthUrl
};