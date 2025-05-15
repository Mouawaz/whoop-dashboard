const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function fetchWhoopData() {
  try {
    // Use the access token directly from environment variable
    const accessToken = process.env.WHOOP_ACCESS_TOKEN;
    
    // Verify we have an access token
    if (!accessToken) {
      throw new Error('No access token found. Please set the WHOOP_ACCESS_TOKEN environment variable.');
    }
    
    // Use the access token to fetch data
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
  } catch (error) {
    console.error('Error fetching Whoop data:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      
      // Check if the error is due to an expired token
      if (error.response.status === 401) {
        console.error('Access token appears to be expired. Please generate a new one.');
      }
    }
    process.exit(1);
  }
}

fetchWhoopData();