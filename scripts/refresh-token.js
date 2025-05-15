const axios = require('axios');

/**
 * Gets a fresh access token using a refresh token
 * @param {string} clientId - The Whoop client ID
 * @param {string} clientSecret - The Whoop client secret
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{access_token: string, refresh_token: string}>} The tokens
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  try {
    console.log('Getting fresh access token using refresh token...');
    
    const response = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString()
    });
    
    if (!response.data.access_token) {
      throw new Error('No access token received');
    }
    
    console.log('Successfully retrieved new access token');
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token
    };
  } catch (error) {
    console.error('Error getting access token:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

module.exports = {
  getAccessToken
};