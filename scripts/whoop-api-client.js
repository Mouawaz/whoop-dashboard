const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// Create a dedicated class for managing the Access Token Passport
class WhoopPassport {
  constructor(passportFilePath) {
    this.passportFilePath = passportFilePath || path.join(__dirname, 'whoop-passport.json');
    this.passport = null;
    this.API_BASE_URL = 'https://api.prod.whoop.com/developer/v1';
  }

  // Read the passport from file
  readPassport() {
    try {
      if (fs.existsSync(this.passportFilePath)) {
        const data = fs.readFileSync(this.passportFilePath, 'utf8');
        this.passport = JSON.parse(data);
        return this.passport;
      }
    } catch (error) {
      console.error('Error reading passport file:', error.message);
    }
    return null;
  }

  // Save the passport to file
  savePassport() {
    try {
      const dirPath = path.dirname(this.passportFilePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(this.passportFilePath, JSON.stringify(this.passport, null, 2));
      console.log('Passport saved successfully');
    } catch (error) {
      console.error('Error saving passport:', error.message);
      throw error;
    }
  }

  // Create a new passport from tokens (initial setup or after manual refresh)
  createPassport(accessToken, refreshToken, expiresIn) {
    const now = Math.floor(Date.now() / 1000);
    
    this.passport = {
      access_token: accessToken,
      refresh_token: refreshToken,
      created_at: now,
      expires_at: now + expiresIn,
      passport_id: crypto.randomUUID()
    };
    
    this.savePassport();
    return this.passport;
  }

  // Check if token needs refreshing (with 5 minute buffer)
  needsRefresh() {
    if (!this.passport) return true;
    
    const now = Math.floor(Date.now() / 1000);
    // Add 5 minute buffer before expiration
    return now >= (this.passport.expires_at - 300);
  }

  // Refresh the access token
  async refreshAccessToken() {
    try {
      console.log('Refreshing access token...');
      
      const response = await axios({
        method: 'post',
        url: 'https://api.prod.whoop.com/oauth/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.passport.refresh_token
        })
      });

      const now = Math.floor(Date.now() / 1000);
      
      this.passport = {
        ...this.passport,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || this.passport.refresh_token,
        created_at: now,
        expires_at: now + response.data.expires_in
      };
      
      this.savePassport();
      console.log('Access token refreshed successfully');
      return this.passport;
    } catch (error) {
      console.error('Error refreshing token:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error('Failed to refresh token. You may need to re-create your passport.');
    }
  }

  // Get a valid access token (refresh if needed)
  async getValidAccessToken() {
    // Read the passport if not loaded yet
    if (!this.passport) {
      this.passport = this.readPassport();
    }

    // Check if we have a passport and if it needs refreshing
    if (!this.passport) {
      throw new Error('No passport found. Create a passport first with createPassport().');
    }

    if (this.needsRefresh()) {
      await this.refreshAccessToken();
    }

    return this.passport.access_token;
  }

  // Make an authenticated API request
  async apiRequest(method, endpoint, data = null) {
    try {
      const accessToken = await this.getValidAccessToken();
      
      const config = {
        method,
        url: `${this.API_BASE_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`API request failed: ${method} ${endpoint}`);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Error details:', error.message);
      }
      throw error;
    }
  }
}

// Main function to fetch WHOOP data using the passport
async function fetchWhoopData() {
  try {
    console.log('Starting Whoop data fetching process...');
    
    // Initialize the passport manager
    const passportManager = new WhoopPassport();
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Step 1: Get the current cycle collection
    console.log('Step 1: Getting the current cycle collection (limit=1)...');
    const cycleResponse = await passportManager.apiRequest('get', '/cycle/collection?limit=1');
    
    if (!cycleResponse || cycleResponse.length === 0) {
      throw new Error('No cycle data returned from API');
    }
    
    const currentCycle = cycleResponse[0];
    console.log(`Current cycle found: ID ${currentCycle.id}`);
    
    // Step 2: Get recovery for this cycle
    console.log(`Step 2: Getting recovery for cycle ${currentCycle.id}...`);
    const recoveryResponse = await passportManager.apiRequest('get', `/cycle/${currentCycle.id}/recovery`);
    console.log('Successfully fetched recovery data!');
    
    // Get more cycles for historical data
    console.log('Fetching more cycles for historical data...');
    const allCyclesResponse = await passportManager.apiRequest('get', '/cycle/collection?limit=14');
    
    // Process all cycles to get their recovery data
    console.log('Fetching recovery data for all cycles...');
    const recoveries = [];
    
    for (const cycle of allCyclesResponse) {
      try {
        const cycleRecoveryResponse = await passportManager.apiRequest('get', `/cycle/${cycle.id}/recovery`);
        
        if (cycleRecoveryResponse) {
          recoveries.push({
            ...cycleRecoveryResponse,
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
    const sleepResponse = await passportManager.apiRequest('get', '/sleep/collection?limit=14');
    
    // Get workout data
    console.log('Fetching workout collection...');
    const workoutResponse = await passportManager.apiRequest('get', '/workout/collection?limit=14');
    
    // Format data for dashboard compatibility
    const formattedRecoveries = recoveries.map(recovery => ({
      timestamp: recovery.timestamp,
      score: recovery.score ? recovery.score.recovery_score : 0,
      restingHeartRate: recovery.score ? recovery.score.resting_heart_rate : 0,
      heartRateVariability: recovery.score ? recovery.score.heart_rate_variability_ms : 0
    }));
    
    const formattedSleep = sleepResponse.map(sleep => ({
      timestamp: sleep.end, // use end time as timestamp
      score: sleep.score ? sleep.score.sleep_performance_percentage : 0,
      durationInSeconds: sleep.score ? sleep.score.total_sleep_time_milli / 1000 : 0
    }));
    
    const formattedWorkouts = workoutResponse.map(workout => ({
      timestamp: workout.end, // use end time as timestamp
      strain: workout.score ? workout.score.strain : 0,
      caloriesBurned: workout.score ? workout.score.kilojoule * 0.239 : 0, // convert kj to kcal
      activityType: workout.sport_id || "Unknown"
    }));
    
    // Fetch user profile
    let profileData = {};
    try {
      console.log('Fetching user profile data...');
      profileData = await passportManager.apiRequest('get', '/user/profile');
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
      cycle: allCyclesResponse
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
    
    // Generate sample data as fallback
    generateSampleData();
    
    process.exit(1);
  }
}

// Function to generate sample data when API fails
function generateSampleData() {
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
    
    // Generate sample data for each category
    const recoveries = dates.map(date => ({
      timestamp: date,
      score: Math.floor(Math.random() * 40) + 60, // 60-99
      restingHeartRate: Math.floor(Math.random() * 15) + 50, // 50-64
      heartRateVariability: Math.floor(Math.random() * 30) + 40 // 40-69
    }));
    
    const sleeps = dates.map(date => ({
      timestamp: date,
      score: Math.floor(Math.random() * 30) + 70, // 70-99
      durationInSeconds: (Math.floor(Math.random() * 3) + 6) * 3600 // 6-8 hours
    }));
    
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
  } catch (error) {
    console.error('Error generating sample data:', error);
  }
}

// Execute the function when this file is run directly
if (require.main === module) {
  fetchWhoopData()
    .then(exitCode => {
      console.log(`Script completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export functions for use in other modules
module.exports = {
  WhoopPassport,
  fetchWhoopData
};