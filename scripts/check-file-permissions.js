require('dotenv').config({ path: '.env.local' });
const { Client, Storage } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

async function checkFilePermissions() {
  try {
    console.log('Checking files bucket configuration...\n');
    
    const bucket = await storage.getBucket('files');
    console.log('Bucket ID:', bucket.$id);
    console.log('Bucket Name:', bucket.name);
    console.log('Enabled:', bucket.enabled);
    console.log('File Security:', bucket.fileSecurity);
    console.log('\nBucket Permissions:', bucket.$permissions);
    
    // List some files to see their permissions
    console.log('\n\nChecking individual file permissions...\n');
    const files = await storage.listFiles('files', [], 5);
    
    if (files.files.length > 0) {
      console.log('Found', files.total, 'total files, showing first', files.files.length, ':\n');
      files.files.forEach(file => {
        console.log('File:', file.name);
        console.log('  ID:', file.$id);
        console.log('  Permissions:', file.$permissions);
        console.log('');
      });
      
      // Try to get a file view URL
      if (files.files.length > 0) {
        const fileId = files.files[0].$id;
        console.log('\nTesting file view URL for', fileId, '...');
        const viewUrl = storage.getFileView('files', fileId);
        console.log('View URL:', viewUrl.href);
        console.log('\nNote: This URL requires authentication if fileSecurity is enabled');
      }
    } else {
      console.log('No files found in bucket');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkFilePermissions();
