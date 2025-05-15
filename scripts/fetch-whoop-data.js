const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function fetchWhoopData() {
  try {
    console.log('Refreshing access token...');
    
    // Create form data using URLSearchParams, which is the standard way to create form data
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', process.env.WHOOP_REFRESH_TOKEN);
    params.append('client_id', process.env.WHOOP_CLIENT_ID);
    params.append('client_secret', process.env.WHOOP_CLIENT_SECRET);
    // Add redirect_uri which might be required
    params.append('redirect_uri', 'https://mouawaz.github.io/whoop-dashboard/callback.html');
    
    // Log the parameters for debugging
    console.log('Parameters:', {
      grant_type: 'refresh_token',
      client_id: 'CLIENT_ID_PLACEHOLDER', // Don't log the actual ID
      client_secret: 'CLIENT_SECRET_PLACEHOLDER', // Don't log the actual secret
      refresh_token: 'REFRESH_TOKEN_PLACEHOLDER', // Don't log the actual token
      redirect_uri: 'https://mouawaz.github.io/whoop-dashboard/callback.html'
    });

    // Make the token refresh request - use axios.post with string data
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/oauth2/token',
      data: params.toString(),
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // Log success
    console.log('Token refresh successful');
    console.log('Response status:', tokenResponse.status);
    
    // Log token info without logging the actual token values
    const tokenInfo = {
      token_type: tokenResponse.data.token_type,
      expires_in: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope,
      has_access_token: !!tokenResponse.data.access_token,
      has_refresh_token: !!tokenResponse.data.refresh_token
    };
    
    console.log('Token info:', JSON.stringify(tokenInfo, null, 2));
    
    // Get the new tokens
    const accessToken = tokenResponse.data.access_token;
    const newRefreshToken = tokenResponse.data.refresh_token;
    
    // Create a sample data file as a test
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write a basic file with the token info (not the tokens themselves)
    fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
      tokenInfo: tokenInfo,
      status: 'Token refresh successful',
      lastUpdated: new Date().toISOString()
    }, null, 2));
    
    console.log('Sample data file created');
    
    // If there's a new refresh token, log it for updating GitHub secrets
    if (newRefreshToken && newRefreshToken !== process.env.WHOOP_REFRESH_TOKEN) {
      console.log('New refresh token received. Update your GitHub secret with this value.');
    }
    
    return 0;
  } catch (error) {
    console.error('Error in token refresh:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error);
    }
    
    // Create minimal data file with error info
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
        error: true,
        errorMessage: error.message,
        status: 'Token refresh failed',
        lastUpdated: new Date().toISOString()
      }, null, 2));
      
      console.log('Error info file created');
    } catch (fsError) {
      console.error('Failed to create data file:', fsError.message);
    }
    
    process.exit(1);
  }
}

// Execute and handle the promise
fetchWhoopData()
  .then(exitCode => {
    console.log('Script completed with exit code:', exitCode);
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });