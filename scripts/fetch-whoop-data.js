const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Create data directory if it doesn't exist
const ensureDataDir = () => {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
};

// Save error data
const saveErrorData = (error) => {
  try {
    const dataDir = ensureDataDir();
    fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
      error: true,
      errorMessage: error.message,
      lastUpdated: new Date().toISOString(),
      recovery: [],
      sleep: [],
      workout: [],
      cycle: []
    }, null, 2));
    console.log('Created error data file');
  } catch (fsError) {
    console.error('Failed to create data file:', fsError.message);
  }
};

// Main function
async function refreshToken() {
  try {
    console.log('Starting token refresh process...');
    
    // Using exact URL from the documentation
    const tokenUrl = 'https://api.prod.whoop.com/oauth/oauth2/token';
    
    // Create a URLSearchParams object for form data
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', process.env.WHOOP_REFRESH_TOKEN);
    params.append('client_id', process.env.WHOOP_CLIENT_ID);
    params.append('client_secret', process.env.WHOOP_CLIENT_SECRET);
    // Important: include the redirect URI even for refresh flow
    params.append('redirect_uri', 'https://mouawaz.github.io/whoop-dashboard/callback.html');
    
    console.log('Making token refresh request...');
    
    // Make request with proper Content-Type
    const response = await axios({
      method: 'post',
      url: tokenUrl,
      data: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Token refresh successful!');
    console.log('Status:', response.status);
    
    // Save basic data with token info
    const dataDir = ensureDataDir();
    fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
      lastUpdated: new Date().toISOString(),
      tokenInfo: {
        hasAccessToken: !!response.data.access_token,
        hasRefreshToken: !!response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope
      },
      // Placeholder data for dashboard
      recovery: [],
      sleep: [],
      workout: [],
      cycle: []
    }, null, 2));
    
    console.log('Successfully saved token information');
    
    // If successful, display a message about updating the refresh token if needed
    if (response.data.refresh_token !== process.env.WHOOP_REFRESH_TOKEN) {
      console.log('⚠️ Received a new refresh token, update your GitHub secrets!');
    }
    
    return 0;
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error);
    }
    
    saveErrorData(error);
    return 1;
  }
}

// Execute the function
refreshToken()
  .then(exitCode => {
    console.log(`Script completed with exit code: ${exitCode}`);
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    saveErrorData(error);
    process.exit(1);
  });