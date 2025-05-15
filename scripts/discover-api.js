const axios = require('axios');

// The access token we have
const accessToken = "j-kQQGdjw0aRi2hdrPvAwPfB4ot8DBkT3y7zfv_XiP8.hnDJYY5f2VCBw3aMsqpYR93JqLC7HJsY6OMaYWcc6KA";

// List of potential base URLs to test
const potentialBaseUrls = [
  'https://api.prod.whoop.com',
  'https://api.prod.whoop.com/api',
  'https://api.prod.whoop.com/v1',
  'https://api.prod.whoop.com/developer',
  'https://api.prod.whoop.com/developer/v1',
  'https://api.whoop.com',
  'https://api.whoop.com/api',
  'https://api.whoop.com/v1',
  'https://developer.whoop.com',
  'https://developer.whoop.com/api'
];

// List of potential endpoints to test
const potentialEndpoints = [
  '/user',
  '/user/profile',
  '/profile',
  '/me',
  '/users/me',
  '/users/profile',
  '/profile/me',
  '/cycle/collection',
  '/recovery/collection',
  '/sleep/collection',
  '/workout/collection',
  '/activities/recovery',
  '/activities/sleep',
  '/activities/workout',
  '/activities/cycle'
];

// Function to test a specific endpoint
async function testEndpoint(baseUrl, endpoint) {
  try {
    const response = await axios({
      method: 'get',
      url: `${baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      timeout: 5000 // 5 second timeout
    });
    
    console.log(`✅ SUCCESS: ${baseUrl}${endpoint} - Status: ${response.status}`);
    console.log(`    Response Type: ${typeof response.data === 'object' ? 'JSON Object' : typeof response.data}`);
    console.log(`    Data overview: ${JSON.stringify(response.data).substring(0, 100)}...`);
    return true;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code outside the 2xx range
      console.log(`❌ ${baseUrl}${endpoint} - Status: ${error.response.status}`);
      
      // If it's a 401 Unauthorized error, this means the endpoint likely exists
      if (error.response.status === 401) {
        console.log(`    (This endpoint might exist but requires different authentication)`);
        return false;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.log(`❌ ${baseUrl}${endpoint} - No response (timeout or network error)`);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log(`❌ ${baseUrl}${endpoint} - Error: ${error.message}`);
    }
    return false;
  }
}

// Main function to test all combinations
async function discoverEndpoints() {
  console.log('WHOOP API Endpoint Discovery Tool');
  console.log('================================\n');
  
  const workingEndpoints = [];
  
  for (const baseUrl of potentialBaseUrls) {
    console.log(`\nTesting base URL: ${baseUrl}`);
    console.log('-'.repeat(baseUrl.length + 16));
    
    for (const endpoint of potentialEndpoints) {
      const success = await testEndpoint(baseUrl, endpoint);
      if (success) {
        workingEndpoints.push(`${baseUrl}${endpoint}`);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n\nSUMMARY');
  console.log('=======');
  if (workingEndpoints.length > 0) {
    console.log('Working endpoints:');
    workingEndpoints.forEach(endpoint => console.log(`- ${endpoint}`));
  } else {
    console.log('No working endpoints found. Possible reasons:');
    console.log('1. The access token might be expired or invalid');
    console.log('2. The correct endpoint wasn\'t in our test list');
    console.log('3. The Whoop API might have additional requirements or headers');
  }
}

// Run the discovery
discoverEndpoints()
  .then(() => {
    console.log('\nDiscovery completed');
  })
  .catch(error => {
    console.error('Error running discovery:', error);
  });