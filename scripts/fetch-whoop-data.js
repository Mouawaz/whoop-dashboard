const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function fetchWhoopData() {
  try {
    console.log('Refreshing access token...');
    
    // Create form data using URLSearchParams
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', process.env.WHOOP_REFRESH_TOKEN);
    params.append('client_id', process.env.WHOOP_CLIENT_ID);
    params.append('client_secret', process.env.WHOOP_CLIENT_SECRET);
    // Note: redirect_uri is typically NOT required for refresh token flow
    
    // Log the parameters for debugging (without exposing secrets)
    console.log('Parameters:', {
      grant_type: 'refresh_token',
      client_id: 'CLIENT_ID_PLACEHOLDER',
      client_secret: 'CLIENT_SECRET_PLACEHOLDER',
      refresh_token: 'REFRESH_TOKEN_PLACEHOLDER'
    });

    // Make the token refresh request - use the correct endpoint
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/token',
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
    
    // Now that we have a valid token, let's fetch the actual Whoop data
    console.log('Fetching Whoop data...');
    
    // Get recovery data
    const recoveryResponse = await axios({
      method: 'get',
      url: 'https://api.prod.whoop.com/activities/recovery',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Get sleep data
    const sleepResponse = await axios({
      method: 'get',
      url: 'https://api.prod.whoop.com/activities/sleep',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Get workout data
    const workoutResponse = await axios({
      method: 'get',
      url: 'https://api.prod.whoop.com/activities/workout',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Get cycle data
    const cycleResponse = await axios({
      method: 'get',
      url: 'https://api.prod.whoop.com/activities/cycle',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Combine all data
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      recovery: recoveryResponse.data.records || [],
      sleep: sleepResponse.data.records || [],
      workout: workoutResponse.data.records || [],
      cycle: cycleResponse.data.records || []
    };
    
    // Write the data to file
    fs.writeFileSync(
      path.join(dataDir, 'all-data.json'), 
      JSON.stringify(combinedData, null, 2)
    );
    
    console.log('Successfully fetched and saved Whoop data');
    
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