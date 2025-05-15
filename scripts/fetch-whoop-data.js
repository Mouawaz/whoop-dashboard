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
    const API_BASE_URL = 'https://api.prod.whoop.com/developer/v1';
    
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
      url: `${API_BASE_URL}/user/profile/basic`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Profile fetched successfully');
    
    // Get the current cycles (most recent)
    console.log('Fetching most recent cycles...');
    const cycleResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/cycle/collection`,
      params: { limit: 14 },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${cycleResponse.data.records.length} cycles`);
    
    // Now get recoveries for each cycle
    console.log('Fetching recovery data for each cycle...');
    const recoveries = [];
    
    for (const cycle of cycleResponse.data.records) {
      try {
        const recoveryResponse = await axios({
          method: 'get',
          url: `${API_BASE_URL}/cycle/${cycle.id}/recovery`,
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
      url: `${API_BASE_URL}/sleep/collection`,
      params: { 
        start_date: startDate,
        end_date: endDate
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${sleepResponse.data.records.length} sleep records`);
    
    // Get workout data
    console.log('Fetching workout data...');
    const workoutResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/workout/collection`,
      params: { 
        start_date: startDate,
        end_date: endDate
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${workoutResponse.data.records.length} workout records`);
    
    // Format data for dashboard compatibility
    const formattedRecoveries = recoveries.map(recovery => ({
      timestamp: recovery.timestamp,
      score: recovery.score ? recovery.score.recovery_score : 0,
      restingHeartRate: recovery.score ? recovery.score.resting_heart_rate : 0,
      heartRateVariability: recovery.score ? recovery.score.hrv_rmssd_milli : 0
    }));
    
    const formattedSleep = sleepResponse.data.records.map(sleep => ({
      timestamp: sleep.end, // use end time as timestamp
      score: sleep.score ? sleep.score.sleep_performance_percentage : 0,
      durationInSeconds: sleep.score ? sleep.score.total_sleep_time_milli / 1000 : 0
    }));
    
    const formattedWorkouts = workoutResponse.data.records.map(workout => ({
      timestamp: workout.end, // use end time as timestamp
      strain: workout.score ? workout.score.strain : 0,
      caloriesBurned: workout.score ? workout.score.kilojoule * 0.239 : 0, // convert kj to kcal
      activityType: workout.sport_id || "Unknown"
    }));
    
    // Combine all data in the format expected by the dashboard
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      profile: profileResponse.data,
      recovery: formattedRecoveries,
      sleep: formattedSleep,
      workout: formattedWorkouts,
      cycle: cycleResponse.data.records
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