const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { WhoopPassport } = require('./whoop-api-client');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to store the passport file
const PASSPORT_FILE_PATH = path.join(__dirname, 'whoop-passport.json');

/**
 * Manual setup process for creating a WHOOP Access Token Passport
 * This follows the WHOOP documentation at https://developer.whoop.com/docs/tutorials/access-token-passport
 */
async function setupPassport() {
  console.log('\n=== WHOOP Access Token Passport Setup ===\n');
  console.log('This utility will help you create a WHOOP Access Token Passport.');
  console.log('Follow these steps to get your tokens:\n');
  console.log('1. Go to the WHOOP developer portal: https://developer.whoop.com');
  console.log('2. Create or select your application');
  console.log('3. Navigate to the "Passport" tab');
  console.log('4. Click "Create Passport" button');
  console.log('5. Copy the Access Token and Refresh Token when prompted below\n');
  
  // Ask for the access token
  const accessToken = await new Promise(resolve => {
    rl.question('Enter your Access Token: ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  if (!accessToken) {
    console.error('Access Token is required.');
    process.exit(1);
  }
  
  // Ask for the refresh token
  const refreshToken = await new Promise(resolve => {
    rl.question('Enter your Refresh Token: ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  if (!refreshToken) {
    console.error('Refresh Token is required.');
    process.exit(1);
  }
  
  // Default expiration time is typically 24 hours (86400 seconds)
  // This can vary, so ask the user
  const expiresIn = await new Promise(resolve => {
    rl.question('Enter token expiration in seconds (default: 86400): ', (answer) => {
      const value = parseInt(answer) || 86400;
      resolve(value);
    });
  });
  
  try {
    // Create the passport manager and save the tokens
    const passportManager = new WhoopPassport(PASSPORT_FILE_PATH);
    passportManager.createPassport(accessToken, refreshToken, expiresIn);
    
    console.log('\nSuccess! Your Access Token Passport has been created and saved.');
    console.log(`Passport file location: ${PASSPORT_FILE_PATH}`);
    console.log('\nYou can now run the main script to fetch your WHOOP data.');
    
    return 0;
  } catch (error) {
    console.error('Error creating passport:', error);
    return 1;
  } finally {
    rl.close();
  }
}

/**
 * Display the current passport information
 */
function showPassportInfo() {
  try {
    if (!fs.existsSync(PASSPORT_FILE_PATH)) {
      console.log('No passport file found. Run with --setup to create one.');
      return 1;
    }
    
    const passportData = JSON.parse(fs.readFileSync(PASSPORT_FILE_PATH, 'utf8'));
    
    // Calculate expiration info
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = passportData.expires_at - now;
    const isExpired = expiresIn <= 0;
    
    console.log('\n=== WHOOP Access Token Passport Info ===\n');
    console.log(`Passport ID: ${passportData.passport_id}`);
    console.log(`Created: ${new Date(passportData.created_at * 1000).toLocaleString()}`);
    console.log(`Expires: ${new Date(passportData.expires_at * 1000).toLocaleString()}`);
    console.log(`Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);
    
    if (!isExpired) {
      // Format time remaining
      const hoursLeft = Math.floor(expiresIn / 3600);
      const minutesLeft = Math.floor((expiresIn % 3600) / 60);
      console.log(`Time remaining: ${hoursLeft}h ${minutesLeft}m`);
    } else {
      console.log('Token is expired but will be refreshed automatically on next use.');
    }
    
    return 0;
  } catch (error) {
    console.error('Error reading passport file:', error);
    return 1;
  }
}

/**
 * Delete the passport file
 */
function deletePassport() {
  return new Promise(resolve => {
    if (!fs.existsSync(PASSPORT_FILE_PATH)) {
      console.log('No passport file found.');
      resolve(0);
      return;
    }
    
    rl.question('Are you sure you want to delete your passport? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        try {
          fs.unlinkSync(PASSPORT_FILE_PATH);
          console.log('Passport deleted successfully.');
          resolve(0);
        } catch (error) {
          console.error('Error deleting passport:', error);
          resolve(1);
        }
      } else {
        console.log('Passport deletion cancelled.');
        resolve(0);
      }
      rl.close();
    });
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Handle command line arguments
  if (args.includes('--setup') || args.includes('-s')) {
    return await setupPassport();
  } else if (args.includes('--info') || args.includes('-i')) {
    return showPassportInfo();
  } else if (args.includes('--delete') || args.includes('-d')) {
    return await deletePassport();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log('\n=== WHOOP Passport Manager ===\n');
    console.log('Usage:');
    console.log('  node setup-passport.js [options]\n');
    console.log('Options:');
    console.log('  --setup, -s    Create a new Access Token Passport');
    console.log('  --info, -i     Show information about the existing passport');
    console.log('  --delete, -d   Delete the existing passport');
    console.log('  --help, -h     Show this help message\n');
    return 0;
  } else {
    // If no file exists, default to setup
    if (!fs.existsSync(PASSPORT_FILE_PATH)) {
      console.log('No passport file found. Starting setup...');
      return await setupPassport();
    } else {
      return showPassportInfo();
    }
  }
}

// Execute main function
main()
  .then(exitCode => {
    if (rl.listenerCount('line') === 0) {
      rl.close();
    }
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  });