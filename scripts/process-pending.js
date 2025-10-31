const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Import processing functions
async function processPendingPolicies() {
  console.log('🔄 Processing Pending Policies Manually');
  console.log('========================================\n');

  try {
    // Get all pending policies
    const pendingPolicies = await prisma.policy.findMany({
      where: {
        status: 'pending'
      },
      include: {
        state: true
      }
    });

    console.log(`Found ${pendingPolicies.length} pending policies to process\n`);

    if (pendingPolicies.length === 0) {
      console.log('✅ No pending policies found!');
      return;
    }

    for (const policy of pendingPolicies) {
      console.log(`\n🔄 Processing: ${policy.state.name} - ${policy.title}`);
      
      try {
        // Update status to processing
        await prisma.policy.update({
          where: { id: policy.id },
          data: { status: 'processing' }
        });

        // Check if we have the original file
        const pdfPath = path.join(__dirname, '..', 'Policy_data_CCHP', policy.fileName);
        
        if (!fs.existsSync(pdfPath)) {
          console.log(`❌ PDF file not found: ${policy.fileName}`);
          await prisma.policy.update({
            where: { id: policy.id },
            data: { status: 'failed' }
          });
          continue;
        }

        console.log(`📄 Found PDF file, triggering API processing...`);
        
        // Make API call to trigger processing
        const FormData = require('form-data');
        const formData = new FormData();
        const fileStream = fs.createReadStream(pdfPath);
        formData.append('file', fileStream, policy.fileName);

        const response = await fetch('http://localhost:3000/api/ingest', {
          method: 'POST',
          body: formData,
          headers: formData.getHeaders(),
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Successfully triggered processing for ${policy.state.name}`);
        } else {
          console.log(`❌ Failed to trigger processing: ${result.error}`);
        }

      } catch (error) {
        console.log(`❌ Error processing ${policy.state.name}: ${error.message}`);
        
        await prisma.policy.update({
          where: { id: policy.id },
          data: { status: 'failed' }
        });
      }
    }

    console.log('\n🎉 Manual processing trigger completed!');
    console.log('📝 Check the server logs to monitor background processing.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Wait for dependencies to load
(async () => {
  let fetch;
  if (!global.fetch) {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
    global.fetch = fetch;
  }
  await processPendingPolicies();
})();
