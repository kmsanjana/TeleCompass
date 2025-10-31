const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Use dynamic import for fetch in Node.js
let fetch;
(async () => {
  const { default: nodeFetch } = await import('node-fetch');
  fetch = nodeFetch;
})();

// Configuration
const PDF_FOLDER = path.join(__dirname, '..', 'Policy_data_CCHP');
const API_URL = 'http://localhost:3000/api/ingest';
const DELAY_BETWEEN_UPLOADS = 5000; // 5 seconds

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadPDF(filePath, fileName) {
  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    formData.append('file', fileStream, fileName);

    console.log(`📤 Uploading: ${fileName}`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Success: ${fileName}`);
      console.log(`   Policy ID: ${result.policyId}`);
      console.log(`   State: ${result.stateName}`);
      return { success: true, fileName, result };
    } else {
      console.log(`❌ Failed: ${fileName}`);
      console.log(`   Error: ${result.error}`);
      return { success: false, fileName, error: result.error };
    }
  } catch (error) {
    console.log(`❌ Error uploading ${fileName}: ${error.message}`);
    return { success: false, fileName, error: error.message };
  }
}

async function main() {
  console.log('🚀 TeleCompass Bulk PDF Ingestion');
  console.log('==================================\n');

  // Wait for fetch to be loaded
  if (!fetch) {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
  }

  // Check if PDF folder exists
  if (!fs.existsSync(PDF_FOLDER)) {
    console.error(`❌ PDF folder not found: ${PDF_FOLDER}`);
    console.error('Please create the Policy_data_CCHP folder and add your PDF files.');
    process.exit(1);
  }

  // Get all PDF files
  const files = fs.readdirSync(PDF_FOLDER)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .sort();

  if (files.length === 0) {
    console.error('❌ No PDF files found in the Policy_data_CCHP folder.');
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} PDF files\n`);

  const results = {
    successful: [],
    failed: []
  };

  // Process each file
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(PDF_FOLDER, fileName);
    
    console.log(`[${i + 1}/${files.length}] Processing: ${fileName}`);
    
    const result = await uploadPDF(filePath, fileName);
    
    if (result.success) {
      results.successful.push(result);
    } else {
      results.failed.push(result);
    }

    // Wait between uploads (except for the last file)
    if (i < files.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_UPLOADS / 1000}s before next upload...`);
      await sleep(DELAY_BETWEEN_UPLOADS);
    }
    
    console.log(''); // Empty line for readability
  }

  // Print summary
  console.log('📊 Upload Summary');
  console.log('==================');
  console.log(`✅ Successful: ${results.successful.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`📁 Total: ${files.length}`);

  if (results.failed.length > 0) {
    console.log('\n⚠️  Some uploads failed. Check the logs above for details.');
    console.log('Failed files:');
    results.failed.forEach(item => {
      console.log(`  - ${item.fileName}: ${item.error}`);
    });
  } else {
    console.log('\n🎉 All files uploaded successfully!');
  }

  if (results.successful.length > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Monitor the server logs to see processing progress');
    console.log('2. Check Prisma Studio (npm run db:studio) to verify data');
    console.log('3. Set ALLOW_INGEST=false in .env to disable ingestion');
    console.log('4. Restart the dev server to apply the change');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Upload interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Upload terminated');
  process.exit(0);
});

// Run the script
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
