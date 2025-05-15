const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function fetchWhoopData() {
  try {
    console.log('Starting Whoop data fetching process...');
    
    // The current Whoop API uses a different base URL and endpoints
    const API_BASE_URL = 'https://api.prod.whoop.com/developer/v1';
    
    // First, try to refresh the token
    console.log('Refreshing access token...');
    
    const refreshParams = new URLSearchParams();
    refreshParams.append('grant_type', 'refresh_token');
    refreshParams.append('refresh_token', process.env.WHOOP_REFRESH_TOKEN);
    refreshParams.append('client_id', process.env.WHOOP_CLIENT_ID);
    refreshParams.append('client_secret', process.env.WHOOP_CLIENT_SECRET);
    
    // Log the parameters for debugging (without exposing secrets)
    console.log('Parameters for refresh:', {
      grant_type: 'refresh_token',
      client_id: 'CLIENT_ID_PLACEHOLDER',
      client_secret: 'CLIENT_SECRET_PLACEHOLDER',
      refresh_token: 'REFRESH_TOKEN_PLACEHOLDER'
    });
    
    // Make the token refresh request
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/token',
      data: refreshParams.toString(),
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Token refresh successful');
    console.log('Response status:', tokenResponse.status);
    
    // Get the new tokens
    const accessToken = tokenResponse.data.access_token;
    const newRefreshToken = tokenResponse.data.refresh_token;
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Calculate date ranges for queries
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const startDate = twoWeeksAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const endDate = now.toISOString().split('T')[0];
    
    console.log(`Fetching data from ${startDate} to ${endDate}`);
    
    // Now use the developer API endpoints to fetch data
    // Get user profile
    const profileResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/user/profile`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Successfully fetched user profile');
    
    // Get recovery collection data
    const recoveryResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/recovery/collection?start_date=${startDate}&end_date=${endDate}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Successfully fetched recovery data');
    
    // Get sleep collection data
    const sleepResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/sleep/collection?start_date=${startDate}&end_date=${endDate}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Successfully fetched sleep data');
    
    // Get workout collection data
    const workoutResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/workout/collection?start_date=${startDate}&end_date=${endDate}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Successfully fetched workout data');
    
    // Get cycle collection data
    const cycleResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/cycle/collection?start_date=${startDate}&end_date=${endDate}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Successfully fetched cycle data');
    
    // Combine all data
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      profile: profileResponse.data,
      recovery: recoveryResponse.data,
      sleep: sleepResponse.data,
      workout: workoutResponse.data,
      cycle: cycleResponse.data
    };
    
    // Write the data to file
    fs.writeFileSync(
      path.join(dataDir, 'all-data.json'), 
      JSON.stringify(combinedData, null, 2)
    );
    
    console.log('Successfully fetched and saved Whoop data');
    
    // If there's a new refresh token, log a message about updating GitHub secrets
    if (newRefreshToken && newRefreshToken !== process.env.WHOOP_REFRESH_TOKEN) {
      console.log('New refresh token received. Update your GitHub secret with this value.');
    }
    
    return 0;
  } catch (error) {
    console.error('Error in main execution:', error.message);
    
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
        status: 'API request failed',
        lastUpdated: new Date().toISOString(),
        // Include sample structure for the dashboard
        recovery: [],
        sleep: [],
        workout: [],
        cycle: []
      }, null, 2));
      
      console.log('Created data file with error information');
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