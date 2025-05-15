#!/usr/bin/env node

const open = require('open');
const http = require('http');
const url = require('url');
const { fetchWhoopData } = require('./whoop-api-client');

// Configure your OAuth application details
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your actual client ID
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPE = 'read:recovery read:cycles read:sleep read:workout read:profile offline';

// Authorization URL
const AUTH_URL = `https://api.prod.whoop.com/oauth/oauth2/auth?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}`;

// Start the OAuth flow
console.log('Starting WHOOP authentication process...');
console.log('Opening browser for WHOOP authorization...');

// Open the browser for user to log in and authorize
open(AUTH_URL);

// Create a simple server to handle the callback
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/callback') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    
    const authorizationCode = parsedUrl.query.code;
    
    if (authorizationCode) {
      res.end(`
        <html>
          <body>
            <h1>Authorization Successful!</h1>
            <p>You can close this window now and return to the application.</p>
          </body>
        </html>
      `);
      
      console.log('Authorization code received. Fetching data...');
      
      // Close the server
      server.close();
      
      // Exchange the code for a token and fetch WHOOP data
      try {
        await fetchWhoopData(authorizationCode);
        console.log('Done! You can now use the WHOOP API.');
        process.exit(0);
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
    } else {
      console.error('No authorization code received');
      res.end(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>No authorization code received. Please try again.</p>
          </body>
        </html>
      `);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Waiting for authorization on http://localhost:${PORT}/callback`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});