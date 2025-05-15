const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function fetchWhoopData() {
  try {
    // Get new access token using refresh token
    console.log('Refreshing access token...');
    const tokenResponse = await axios.post('https://api.prod.whoop.com/oauth/oauth2/token', {
      grant_type: 'refresh_token',
      refresh_token: process.env.WHOOP_REFRESH_TOKEN,
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET
    });

    const accessToken = tokenResponse.data.access_token;
    // Save the new refresh token for next time
    const newRefreshToken = tokenResponse.data.refresh_token;
    
    console.log('Token refreshed successfully');
    
    // Now use the access token to fetch data
    const headers = {
      'Authorization': `Bearer ${accessToken}`
    };

    // Get recovery data
    console.log('Fetching recovery data...');
    const recoveryResponse = await axios.get('https://api.prod.whoop.com/v1/cycle/recovery', { headers });
    
    // Get cycle data
    console.log('Fetching cycles data...');
    const cycleResponse = await axios.get('https://api.prod.whoop.com/v1/cycles', { headers });
    
    // Get sleep data
    console.log('Fetching sleep data...');
    const sleepResponse = await axios.get('https://api.prod.whoop.com/v1/cycle/sleep', { headers });
    
    // Get workout data
    console.log('Fetching workout data...');
    const workoutResponse = await axios.get('https://api.prod.whoop.com/v1/cycle/workout', { headers });

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write data to files
    fs.writeFileSync(path.join(dataDir, 'recovery.json'), JSON.stringify(recoveryResponse.data, null, 2));
    fs.writeFileSync(path.join(dataDir, 'cycle.json'), JSON.stringify(cycleResponse.data, null, 2));
    fs.writeFileSync(path.join(dataDir, 'sleep.json'), JSON.stringify(sleepResponse.data, null, 2));
    fs.writeFileSync(path.join(dataDir, 'workout.json'), JSON.stringify(workoutResponse.data, null, 2));
    
    // Also create a combined data file for easy access
    fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
      recovery: recoveryResponse.data,
      cycle: cycleResponse.data,
      sleep: sleepResponse.data,
      workout: workoutResponse.data,
      lastUpdated: new Date().toISOString()
    }, null, 2));
    
    console.log('Data updated successfully');
    
    // If the refresh token has changed, we should log it so it can be updated in GitHub secrets
    if (newRefreshToken && newRefreshToken !== process.env.WHOOP_REFRESH_TOKEN) {
      console.log('New refresh token received. Update your GitHub secret with this value:');
      console.log(newRefreshToken);
    }
  } catch (error) {
    console.error('Error fetching Whoop data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

fetchWhoopData();