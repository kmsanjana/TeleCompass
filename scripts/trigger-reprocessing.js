const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

const prisma = new PrismaClient();

async function triggerReprocessing() {
  console.log('🔄 Triggering Reprocessing of Pending Policies');
  console.log('==============================================\n');

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

    console.log(`Found ${pendingPolicies.length} pending policies\n`);

    if (pendingPolicies.length === 0) {
      console.log('✅ No pending policies found!');
      return;
    }

    // List pending policies
    console.log('📋 Pending policies:');
    pendingPolicies.forEach((policy, index) => {
      console.log(`${index + 1}. ${policy.state.name} - ${policy.title}`);
    });

    console.log('\n📝 These will be automatically processed by the background worker.');
    console.log('💡 Check the server logs to monitor processing progress.');
    console.log('🔍 Use Prisma Studio to see status updates in real-time.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Wait for fetch to be available
(async () => {
  if (!fetch) {
    const { default: nodeFetch } = await import('node-fetch');
    fetch = nodeFetch;
  }
  await triggerReprocessing();
})();
