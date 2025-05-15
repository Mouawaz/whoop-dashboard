
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getAccessToken } = require('./refresh-token');

async function fetchWhoopData() {
  try {
    console.log('Starting Whoop data fetching process...');
    
    // Get credentials from environment variables (GitHub Secrets)
    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    const refreshToken = process.env.WHOOP_REFRESH_TOKEN;
    
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing required environment variables. Make sure WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, and WHOOP_REFRESH_TOKEN are set in your GitHub secrets.');
    }
    
    // Get a fresh access token using the refresh token
    const tokens = await getAccessToken(clientId, clientSecret, refreshToken);
    const accessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token;
    
    // Log token expiration info
    console.log(`Access token will expire in ${tokens.expires_in} seconds`);
    
    // API base URL
    const API_BASE_URL = 'https://api.prod.whoop.com/v1';
    
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
    
    // Fetch user profile data
    console.log('Fetching user profile...');
    const profileResponse = await axios({
      method: 'get',
      url: `https://api.prod.whoop.com/v1/user`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Profile fetched successfully');
    
    // Get the current cycles (most recent)
    console.log('Fetching most recent cycles...');
    const cycleResponse = await axios({
      method: 'get',
      url: `https://api.prod.whoop.com/v1/cycle`,
      params: { limit: 14 },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${cycleResponse.data.length || (cycleResponse.data.records && cycleResponse.data.records.length) || 0} cycles`);
    
    // Now get recoveries for each cycle
    console.log('Fetching recovery data for each cycle...');
    const recoveries = [];
    
    const cycles = Array.isArray(cycleResponse.data) ? cycleResponse.data : 
                  (cycleResponse.data.records ? cycleResponse.data.records : []);
    
    for (const cycle of cycles) {
      try {
        const recoveryResponse = await axios({
          method: 'get',
          url: `https://api.prod.whoop.com/v1/recovery/${cycle.id}`,
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (recoveryResponse.data) {
          recoveries.push({
            ...recoveryResponse.data,
            timestamp: cycle.start // Use cycle start time for timestamp
          });
          console.log(`Recovery data fetched for cycle ${cycle.id}`);
        }
      } catch (error) {
        // Some cycles might not have recovery data, just continue
        console.log(`No recovery data for cycle ${cycle.id}`);
      }
    }
    
    // Get sleep data
    console.log('Fetching sleep data...');
    const sleepResponse = await axios({
      method: 'get',
      url: `https://api.prod.whoop.com/v1/activity/sleep`,
      params: { 
        start: startDate,
        end: endDate
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${sleepResponse.data.length || (sleepResponse.data.records && sleepResponse.data.records.length) || 0} sleep records`);
    
    // Get workout data
    console.log('Fetching workout data...');
    const workoutResponse = await axios({
      method: 'get',
      url: `https://api.prod.whoop.com/v1/activity/workout`,
      params: { 
        start: startDate,
        end: endDate
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${workoutResponse.data.length || (workoutResponse.data.records && workoutResponse.data.records.length) || 0} workout records`);
    
    // Format data for dashboard compatibility
    const formattedRecoveries = recoveries.map(recovery => ({
      timestamp: recovery.timestamp,
      score: recovery.score || (recovery.data && recovery.data.score) || 0,
      restingHeartRate: recovery.resting_heart_rate || (recovery.data && recovery.data.resting_heart_rate) || 0,
      heartRateVariability: recovery.hrv || (recovery.data && recovery.data.hrv) || 0
    }));
    
    const sleepData = Array.isArray(sleepResponse.data) ? sleepResponse.data : 
                     (sleepResponse.data.records ? sleepResponse.data.records : []);
    
    const formattedSleep = sleepData.map(sleep => ({
      timestamp: sleep.end || sleep.created_at,
      score: sleep.score || (sleep.data && sleep.data.score) || 0,
      durationInSeconds: sleep.duration_seconds || (sleep.data && sleep.data.duration_seconds) || 0
    }));
    
    const workoutData = Array.isArray(workoutResponse.data) ? workoutResponse.data : 
                       (workoutResponse.data.records ? workoutResponse.data.records : []);
    
    const formattedWorkouts = workoutData.map(workout => ({
      timestamp: workout.end || workout.created_at,
      strain: workout.strain || (workout.data && workout.data.strain) || 0,
      caloriesBurned: workout.calories || (workout.data && workout.data.calories) || 0,
      activityType: workout.sport_id || workout.type || "Unknown"
    }));
    
    // Combine all data in the format expected by the dashboard
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      profile: profileResponse.data,
      recovery: formattedRecoveries,
      sleep: formattedSleep,
      workout: formattedWorkouts,
      cycle: cycles
    };
    
    // Write the data to file
    fs.writeFileSync(
      path.join(dataDir, 'all-data.json'), 
      JSON.stringify(combinedData, null, 2)
    );
    
    // If we got a new refresh token, we should log it
    if (newRefreshToken && newRefreshToken !== refreshToken) {
      console.log('New refresh token received. You should update your GitHub secret WHOOP_REFRESH_TOKEN with this value.');
      console.log('For security reasons, the token is not printed here.');
    }
    
    console.log('Successfully fetched and saved Whoop data');
    
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
      
      // Create a file with error info
      fs.writeFileSync(path.join(dataDir, 'all-data.json'), JSON.stringify({
        error: true,
        errorMessage: error.message,
        status: 'API request failed',
        lastUpdated: new Date().toISOString(),
        // Include empty structure for the dashboard
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

// Execute the function
fetchWhoopData()
  .then(exitCode => {
    console.log(`Script completed with exit code: ${exitCode}`);
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });