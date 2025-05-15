const fs = require('fs');
const path = require('path');
const axios = require('axios');

// File to store the access token passport data
const TOKEN_FILE_PATH = path.join(__dirname, '..', 'config', 'whoop-token.json');

// Function to read token passport from file
function readTokenPassport() {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading token file:', error);
  }
  return null;
}

// Function to save token passport to file
function saveTokenPassport(tokenData) {
  try {
    // Create config directory if it doesn't exist
    const configDir = path.dirname(TOKEN_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokenData, null, 2));
    console.log('Token passport saved successfully');
  } catch (error) {
    console.error('Error saving token passport:', error);
  }
}

// Function to exchange authorization code for access token
async function exchangeCodeForToken(authorizationCode) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: 'http://localhost:3000/callback' // Update with your redirect URI
      })
    });

    const tokenData = response.data;
    tokenData.created_at = Date.now();
    saveTokenPassport(tokenData);
    return tokenData;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

// Function to refresh the access token
async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    const tokenData = response.data;
    tokenData.created_at = Date.now();
    saveTokenPassport(tokenData);
    return tokenData;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

// Function to get a valid access token
async function getValidAccessToken() {
  let tokenData = readTokenPassport();

  if (!tokenData) {
    console.log('No token passport found. Please provide an authorization code:');
    throw new Error('Authorization code required. Please follow the WHOOP authorization flow first.');
  }

  // Check if token is expired (considering 5 minute buffer)
  const now = Date.now();
  const expiresAt = tokenData.created_at + (tokenData.expires_in * 1000) - (5 * 60 * 1000);

  if (now > expiresAt) {
    console.log('Token expired, refreshing...');
    try {
      tokenData = await refreshAccessToken(tokenData.refresh_token);
    } catch (error) {
      console.error('Failed to refresh token. You may need to re-authenticate.');
      throw error;
    }
  }

  return tokenData.access_token;
}

// Main function to fetch WHOOP data
async function fetchWhoopData(authorizationCode = null) {
  try {
    console.log('Starting Whoop data fetching process...');

    // If authorization code is provided, exchange it for token
    if (authorizationCode) {
      await exchangeCodeForToken(authorizationCode);
    }

    // Get valid access token
    const accessToken = await getValidAccessToken();
    
    // Using the exact API base URL and endpoints from the documentation
    const API_BASE_URL = 'https://api.prod.whoop.com/developer/v1';
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Following the exact approach from the documentation
    console.log('Step 1: Getting the current cycle collection (limit=1)...');
    
    // Get the current cycle (most recent) - using limit=1 as documentation suggests
    const cycleResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/cycle/collection?limit=1`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!cycleResponse.data || cycleResponse.data.length === 0) {
      throw new Error('No cycle data returned from API');
    }
    
    const currentCycle = cycleResponse.data[0];
    console.log(`Current cycle found: ID ${currentCycle.id}`);
    
    // Step 2: Get recovery for this cycle
    console.log(`Step 2: Getting recovery for cycle ${currentCycle.id}...`);
    const recoveryResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/cycle/${currentCycle.id}/recovery`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Successfully fetched recovery data!');
    
    // Get more cycles for historical data
    console.log('Fetching more cycles for historical data...');
    const allCyclesResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/cycle/collection?limit=14`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Process all cycles to get their recovery data
    console.log('Fetching recovery data for all cycles...');
    const recoveries = [];
    
    for (const cycle of allCyclesResponse.data) {
      try {
        const cycleRecoveryResponse = await axios({
          method: 'get',
          url: `${API_BASE_URL}/cycle/${cycle.id}/recovery`,
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (cycleRecoveryResponse.data) {
          recoveries.push({
            ...cycleRecoveryResponse.data,
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
    console.log('Fetching sleep collection...');
    const sleepResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/sleep/collection?limit=14`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Get workout data
    console.log('Fetching workout collection...');
    const workoutResponse = await axios({
      method: 'get',
      url: `${API_BASE_URL}/workout/collection?limit=14`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
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
    
    // Fetch user profile at the end
    let profileData = {};
    try {
      console.log('Fetching user profile data...');
      const profileResponse = await axios({
        method: 'get',
        url: `${API_BASE_URL}/user/profile`,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      profileData = profileResponse.data;
    } catch (error) {
      console.log('Could not fetch profile data, using placeholder');
      profileData = {
        first_name: "Whoop",
        last_name: "User"
      };
    }
    
    // Combine all data in the format expected by the dashboard
    const combinedData = {
      lastUpdated: new Date().toISOString(),
      profile: profileData,
      recovery: formattedRecoveries,
      sleep: formattedSleep.length ? formattedSleep : [],
      workout: formattedWorkouts.length ? formattedWorkouts : [],
      cycle: allCyclesResponse.data
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
      if (error.response.data) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('No response data received');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error details:', error);
    }
    
    // If API fails, generate sample data as fallback
    try {
      console.log('Generating sample data as fallback...');
      
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Generate dates for the past 14 days
      const now = new Date();
      const dates = [];
      for (let i = 0; i < 14; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString());
      }
      
      // Generate sample recovery data
      const recoveries = dates.map(date => ({
        timestamp: date,
        score: Math.floor(Math.random() * 40) + 60, // 60-99
        restingHeartRate: Math.floor(Math.random() * 15) + 50, // 50-64
        heartRateVariability: Math.floor(Math.random() * 30) + 40 // 40-69
      }));
      
      // Generate sample sleep data
      const sleeps = dates.map(date => ({
        timestamp: date,
        score: Math.floor(Math.random() * 30) + 70, // 70-99
        durationInSeconds: (Math.floor(Math.random() * 3) + 6) * 3600 // 6-8 hours
      }));
      
      // Generate sample workout data
      const workouts = dates.slice(0, 10).map(date => ({
        timestamp: date,
        strain: Math.floor(Math.random() * 10) + 5, // 5-14
        caloriesBurned: Math.floor(Math.random() * 400) + 200, // 200-599
        activityType: ["Running", "Cycling", "Swimming", "HIIT", "Yoga"][Math.floor(Math.random() * 5)]
      }));
      
      // Combine all data
      const sampleData = {
        lastUpdated: new Date().toISOString(),
        profile: {
          firstName: "Sample",
          lastName: "User",
          email: "sample.user@example.com"
        },
        recovery: recoveries,
        sleep: sleeps,
        workout: workouts,
        cycle: dates.map(date => ({ timestamp: date }))
      };
      
      // Write the sample data to file
      fs.writeFileSync(
        path.join(dataDir, 'all-data.json'), 
        JSON.stringify(sampleData, null, 2)
      );
      
      console.log('Sample data generated successfully as fallback!');
    } catch (sampleDataError) {
      console.error('Error generating sample data:', sampleDataError);
    }
    
    process.exit(1);
  }
}

// Export the function for use in other modules
module.exports = { fetchWhoopData };

// If this file is run directly, execute the function
if (require.main === module) {
  // Check if authorization code is provided as command line argument
  const authCode = process.argv[2];
  
  fetchWhoopData(authCode)
    .then(exitCode => {
      console.log(`Script completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}