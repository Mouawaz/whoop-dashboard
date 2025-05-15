const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function fetchWhoopData() {
  try {
    console.log('Starting Whoop data fetching process...');
    
    // Access token hardcoded directly in the file
    const accessToken = "j-kQQGdjw0aRi2hdrPvAwPfB4ot8DBkT3y7zfv_XiP8.hnDJYY5f2VCBw3aMsqpYR93JqLC7HJsY6OMaYWcc6KA";
    
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
      url: `${API_BASE_URL}/user/profile`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('Profile fetched successfully');
    
    // Get the current cycle (most recent)
    console.log('Fetching most recent cycles...');
    const cycleResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/cycle/collection?limit=14`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${cycleResponse.data.length} cycles`);
    
    // Now get recoveries for each cycle
    console.log('Fetching recovery data for each cycle...');
    const recoveries = [];
    
    for (const cycle of cycleResponse.data) {
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
      url: `${API_BASE_URL}/sleep/collection?start_date=${startDate}&end_date=${endDate}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${sleepResponse.data.length} sleep records`);
    
    // Get workout data
    console.log('Fetching workout data...');
    const workoutResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/workout/collection?start_date=${startDate}&end_date=${endDate}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`Fetched ${workoutResponse.data.length} workout records`);
    
    // Format data for dashboard compatibility
    const formattedRecoveries = recoveries.map(recovery => ({
      timestamp: recovery.timestamp,
      score: recovery.score ? recovery.score.recovery_score : 0,
      restingHeartRate: recovery.score ? recovery.score.resting_heart_rate : 0,
      heartRateVariability: recovery.score ? recovery.score.heart_rate_variability_ms : 0
    }));
    
    const formattedSleep = sleepResponse.data.map(sleep => ({
      timestamp: sleep.end, // use end time as timestamp
      score: sleep.score ? sleep.score.sleep_performance_percentage : 0,
      durationInSeconds: sleep.score ? sleep.score.total_sleep_time_milli / 1000 : 0
    }));
    
    const formattedWorkouts = workoutResponse.data.map(workout => ({
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
      cycle: cycleResponse.data
    };
    
    // Write the data to file
    fs.writeFileSync(
      path.join(dataDir, 'all-data.json'), 
      JSON.stringify(combinedData, null, 2)
    );
    
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
      
      // Create a sample file with the same structure as expected by the dashboard
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