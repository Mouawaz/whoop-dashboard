const axios = require('axios');

/**
 * Gets a fresh access token using a refresh token
 * @param {string} clientId - The Whoop client ID
 * @param {string} clientSecret - The Whoop client secret
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>} The tokens
 */
async function getAccessToken(clientId, clientSecret, refreshToken) {
  try {
    console.log('Getting fresh access token using refresh token...');
    
    // Prepare the request body parameters
    const params = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      scope: 'offline'  // Required to get a new refresh token
    };
    
    // Convert params to URL encoded form data
    const formData = new URLSearchParams(params).toString();
    
    // Make the token refresh request
    const response = await axios({
      method: 'post',
      url: 'https://api.prod.whoop.com/oauth/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: formData
    });
    
    if (!response.data.access_token) {
      throw new Error('No access token received');
    }
    
    console.log('Successfully retrieved new access token');
    
    // Return the tokens and expiration
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in
    };
  } catch (error) {
    console.error('Error getting access token:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}