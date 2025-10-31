const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function retryFailedPolicies() {
  console.log('🔄 Retrying Failed Policy Processing');
  console.log('=====================================\n');

  try {
    // Get all failed policies
    const failedPolicies = await prisma.policy.findMany({
      where: {
        status: 'failed'
      },
      include: {
        state: true
      }
    });

    console.log(`Found ${failedPolicies.length} failed policies to retry\n`);

    if (failedPolicies.length === 0) {
      console.log('✅ No failed policies found!');
      return;
    }

    // Reset them to pending for retry
    await prisma.policy.updateMany({
      where: {
        status: 'failed'
      },
      data: {
        status: 'pending',
        processedAt: null
      }
    });

    console.log('✅ Reset failed policies to pending status');
    console.log('📝 Restart your dev server to trigger reprocessing');
    console.log('   The background processor will pick up pending policies');

    // List the failed policies
    console.log('\n📋 Policies reset for retry:');
    failedPolicies.forEach((policy, index) => {
      console.log(`${index + 1}. ${policy.state.name} - ${policy.title}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

retryFailedPolicies();
