const fs = require('fs');
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');

async function fetchWhoopData() {
  try {
    // Get new access token using refresh token
    console.log('Refreshing access token...');
    
    // Use querystring to properly format the request body - following Whoop's documentation exactly
    const requestBody = querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: process.env.WHOOP_REFRESH_TOKEN,
      client_id: process.env.WHOOP_CLIENT_ID,
      client_secret: process.env.WHOOP_CLIENT_SECRET,
      scope: 'offline'  // Include scope parameter as shown in Whoop docs
    });
    
    // Make the token refresh request
    const tokenResponse = await axios.post(
      'https://api.prod.whoop.com/oauth/oauth2/token', 
      requestBody,
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': requestBody.length
        } 
      }
    );

    // Log the entire token response for debugging
    console.log('Token response received:', JSON.stringify({
      tokenType: tokenResponse.data.token_type,
      expiresIn: tokenResponse.data.expires_in,
      scope: tokenResponse.data.scope,
      hasAccessToken: !!tokenResponse.data.access_token,
      hasRefreshToken: !!tokenResponse.data.refresh_token
    }));

    const accessToken = tokenResponse.data.access_token;
    // Save the new refresh token for next time
    const newRefreshToken = tokenResponse.data.refresh_token;
    
    console.log('Token refreshed successfully');
    
    // Now use the access token to fetch data
    const headers = {
      'Authorization': `Bearer ${accessToken}`
    };

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      console.log('Creating data directory...');
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Using the correct API endpoints based on Whoop documentation
    // Instead of trying all endpoints at once, we'll try them one by one with error handling
    let recoveryData, cyclesData, sleepData, workoutData, profileData;
    
    try {
      console.log('Fetching recovery data...');
      const recoveryResponse = await axios.get('https://api.prod.whoop.com/developer/v1/recovery', { headers });
      recoveryData = recoveryResponse.data;
      console.log('Recovery data fetched successfully');
    } catch (error) {
      console.error('Error fetching recovery data:', error.message);
      // Try alternative endpoint
      try {
        const altRecoveryResponse = await axios.get('https://api.prod.whoop.com/developer/v1/cycle/recovery', { headers });
        recoveryData = altRecoveryResponse.data;
        console.log('Recovery data fetched successfully from alternative endpoint');
      } catch (altError) {
        console.error('Error fetching recovery data from alternative endpoint:', altError.message);
        recoveryData = { error: 'Failed to fetch recovery data' };
      }
    }
    
    try {
      console.log('Fetching cycles data...');
      const cyclesResponse = await axios.get('https://api.prod.whoop.com/developer/v1/cycle', { headers });
      cyclesData = cyclesResponse.data;
      console.log('Cycles data fetched successfully');
    } catch (error) {
      console.error('Error fetching cycles data:', error.message);
      try {
        const altCyclesResponse = await axios.get('https://api.prod.whoop.com/developer/v1/cycles', { headers });
        cyclesData = altCyclesResponse.data;
        console.log('Cycles data fetched successfully from alternative endpoint');
      } catch (altError) {
        console.error('Error fetching cycles data from alternative endpoint:', altError.message);
        cyclesData = { error: 'Failed to fetch cycles data' };
      }
    }
    
    try {
      console.log('Fetching sleep data...');
      const sleepResponse = await axios.get('https://api.prod.whoop.com/developer/v1/sleep', { headers });
      sleepData = sleepResponse.data;
      console.log('Sleep data fetched successfully');
    } catch (error) {
      console.error('Error fetching sleep data:', error.message);
      try {
        const altSleepResponse = await axios.get('https://api.prod.whoop.com/developer/v1/cycle/sleep', { headers });
        sleepData = altSleepResponse.data;
        console.log('Sleep data fetched successfully from alternative endpoint');
      } catch (altError) {
        console.error('Error fetching sleep data from alternative endpoint:', altError.message);
        sleepData = { error: 'Failed to fetch sleep data' };
      }
    }
    
    try {
      console.log('Fetching workout data...');
      const workoutResponse = await axios.get('https://api.prod.whoop.com/developer/v1/workout', { headers });
      workoutData = workoutResponse.data;
      console.log('Workout data fetched successfully');
    } catch (error) {
      console.error('Error fetching workout data:', error.message);
      try {
        const altWorkoutResponse = await axios.get('https://api.prod.whoop.com/developer/v1/cycle/workout', { headers });
        workoutData = altWorkoutResponse.data;
        console.log('Workout data fetched successfully from alternative endpoint');
      } catch (altError) {
        console.error('Error fetching workout data from alternative endpoint:', altError.message);
        workoutData = { error: 'Failed to fetch workout data' };
      }
    }
    
    try {
      console.log('Fetching profile data...');
      const profileResponse = await axios.get('https://api.prod.whoop.com/developer/v1/profile', { headers });
      profileData = profileResponse.data;
      console.log('Profile data fetched successfully');
    } catch (error) {
      console.error('Error fetching profile data:', error.message);
      try {
        const altProfileResponse = await axios.get('https://api.prod.whoop.com/developer/v1/user/profile', { headers });
        profileData = altProfileResponse.data;
        console.log('Profile data fetched successfully from alternative endpoint');
      } catch (altError) {
        console.error('Error fetching profile data from alternative endpoint:', altError.message);
        profileData = { error: 'Failed to fetch profile data' };
      }
    }

    // Write data to files - this will still create the files even if some data fetching failed
    fs.writeFileSync(path.join(dataDir, 'recovery.json'), JSON.stringify(recoveryData || {}, null, 2));
    fs.writeFileSync(path.join(dataDir, 'cycle.json'), JSON.stringify(cyclesData || {}, null, 2));
    fs.writeFileSync(path.join(dataDir, 'sleep.json'), JSON.stringify(sleepData || {}, null, 2));
    fs.writeFileSync(path.join(dataDir, 'workout.json'), JSON.stringify(workoutData || {}, null, 2));
    fs.writeFileSync(path.join(dataDir, 'profile.json'), JSON.stringify(profileData || {}, null, 2));
    
    // Also create a combined data file for easy access
    fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
      recovery: recoveryData || {},
      cycle: cyclesData || {},
      sleep: sleepData || {},
      workout: workoutData || {},
      profile: profileData || {},
      lastUpdated: new Date().toISOString()
    }, null, 2));
    
    console.log('Data files created successfully');
    
    // If the refresh token has changed, we should log it so it can be updated in GitHub secrets
    if (newRefreshToken && newRefreshToken !== process.env.WHOOP_REFRESH_TOKEN) {
      console.log('New refresh token received. Update your GitHub secret with this value:');
      console.log(newRefreshToken);
    }

    // Success exit
    return 0;
  } catch (error) {
    console.error('Error in main execution:', error.message);
    
    // Detailed error logging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error);
    }
    
    // Try to at least create an empty data directory and all-data.json file
    // so the deployment doesn't fail completely
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create a minimal all-data.json file with error information
      fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
        error: true,
        errorMessage: error.message,
        lastUpdated: new Date().toISOString()
      }, null, 2));
      
      console.log('Created minimal data file with error information');
    } catch (fsError) {
      console.error('Failed to create data directory or minimal data file:', fsError.message);
    }
    
    process.exit(1);
  }
}

// Execute and handle the promise
fetchWhoopData()
  .then(exitCode => {
    if (exitCode === 0) {
      console.log('Script completed successfully');
    } else {
      console.error('Script completed with errors');
      process.exit(exitCode);
    }
  })
  .catch(error => {
    console.error('Unhandled error in script execution:', error);
    process.exit(1);
  });