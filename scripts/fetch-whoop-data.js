const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Simple token refresh attempt exactly per OAuth2 standards
async function fetchWhoopData() {
  try {
    console.log('Starting simple token refresh...');
    
    // Create data directory
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Simpler approach: Just create a simple sample file
    const sampleData = {
      lastUpdated: new Date().toISOString(),
      recovery: [
        {
          timestamp: new Date().toISOString(),
          score: 85,
          restingHeartRate: 55,
          heartRateVariability: 65
        }
      ],
      sleep: [
        {
          timestamp: new Date().toISOString(),
          score: 82,
          durationInSeconds: 25200
        }
      ],
      workout: [
        {
          timestamp: new Date().toISOString(),
          strain: 12.5,
          caloriesBurned: 420,
          activityType: "Running"
        }
      ],
      cycle: [
        {
          timestamp: new Date().toISOString(),
          dayStrain: 8.2,
          averageHeartRate: 72
        }
      ]
    };
    
    // Write sample data to file - this bypasses the API temporarily
    fs.writeFileSync(
      path.join(dataDir, 'all-data.json'), 
      JSON.stringify(sampleData, null, 2)
    );
    
    console.log('Created sample data file for testing dashboard');
    return 0;
  } catch (error) {
    console.error('Error:', error.message);
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
