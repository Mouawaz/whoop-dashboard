const readline = require('readline');

/**
 * Generate the authorization URL for Whoop OAuth
 */
function generateAuthUrl() {
  // Constants required for authorization
  const clientId = process.env.WHOOP_CLIENT_ID || '';
  const redirectUri = 'https://mouawaz.github.io/whoop-dashboard/callback.html';
  const scopes = 'read:recovery read:cycles read:sleep read:workout read:profile';
  
  if (!clientId) {
    console.error('Error: WHOOP_CLIENT_ID environment variable is required.');
    console.error('Set it with: export WHOOP_CLIENT_ID=your_client_id');
    process.exit(1);
  }
  
  // Construct the authorization URL
  const authUrl = `https://api.prod.whoop.com/oauth/authorize?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}`;
  
  console.log("\n=== Whoop API Authorization ===\n");
  console.log("To authorize your application to access your Whoop data, follow these steps:\n");
  console.log("1. Visit this URL in your browser:");
  console.log("\n" + authUrl + "\n");
  console.log("2. Log in with your Whoop credentials and approve the access request");
  console.log("3. You will be redirected to a callback page that displays your authorization code");
  console.log("4. Follow the instructions on that page to exchange the code for tokens");
  console.log("5. Copy the refresh_token value from the response");
  console.log("6. Add the refresh token to your GitHub repository secrets as WHOOP_REFRESH_TOKEN\n");
  
  console.log("Once this is complete, your GitHub Action will be able to fetch your Whoop data automatically.");
}

// Run the function if this script is executed directly
if (require.main === module) {
  generateAuthUrl();
}

module.exports = {
  generateAuthUrl
};