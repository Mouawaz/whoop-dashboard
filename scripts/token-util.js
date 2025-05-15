const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');

/**
 * This utility script helps test and update your Whoop refresh token
 * It can be run locally to test if your token is working
 * and to get a new refresh token if needed.
 */

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

/**
 * Test if a refresh token is valid by trying to get a new access token
 */
async function testRefreshToken(clientId, clientSecret, refreshToken) {
  try {
    console.log('Testing refresh token...');
    
    const params = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      scope: 'offline'
    };
    
    const formData = new URLSearchParams(params).toString();
    
    const response = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: formData
    });
    
    console.log('✅ Success! Refresh token is valid.');
    console.log(`Access token will expire in ${response.data.expires_in} seconds`);
    
    // Return the new tokens
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    };
  } catch (error) {
    console.error('❌ Error: Refresh token is invalid or expired.');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

/**
 * Exchange an authorization code for tokens
 */
async function exchangeCodeForTokens(clientId, clientSecret, code, redirectUri) {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    const params = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    };
    
    const formData = new URLSearchParams(params).toString();
    
    const response = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: formData
    });
    
    console.log('✅ Success! Received tokens.');
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    };
  } catch (error) {
    console.error('❌ Error: Could not exchange code for tokens.');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Print header
    console.log('\n===== Whoop Token Management Utility =====\n');
    
    // Ask for the mode
    const mode = await question(
      'Choose an option:\n' +
      '1. Test existing refresh token\n' +
      '2. Exchange authorization code for tokens\n' +
      'Enter 1 or 2: '
    );
    
    // Get client ID and secret
    const clientId = process.env.WHOOP_CLIENT_ID || await question('Enter your client ID: ');
    const clientSecret = process.env.WHOOP_CLIENT_SECRET || await question('Enter your client secret: ');
    
    if (mode === '1') {
      // Test existing refresh token
      const refreshToken = process.env.WHOOP_REFRESH_TOKEN || await question('Enter your refresh token: ');
      
      const tokens = await testRefreshToken(clientId, clientSecret, refreshToken);
      
      // Notify about new refresh token if it changed
      if (tokens.refresh_token !== refreshToken) {
        console.log('\n🔑 You have a new refresh token. Update your GitHub secrets with this value:');
        console.log(tokens.refresh_token);
      }
    } else if (mode === '2') {
      // Exchange code for tokens
      const code = await question('Enter the authorization code from the callback URL: ');
      const redirectUri = 'https://mouawaz.github.io/whoop-dashboard/callback.html';
      
      const tokens = await exchangeCodeForTokens(clientId, clientSecret, code, redirectUri);
      
      console.log('\n🔑 Here are your tokens:');
      console.log('Access Token:', tokens.access_token);
      console.log('Refresh Token:', tokens.refresh_token);
      console.log('\nAdd the refresh token to your GitHub repository secrets as WHOOP_REFRESH_TOKEN');
    } else {
      console.error('Invalid option selected.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  testRefreshToken,
  exchangeCodeForTokens
};