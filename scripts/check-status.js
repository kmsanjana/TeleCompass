const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStatus() {
  console.log('📊 TeleCompass Processing Status');
  console.log('=================================\n');

  try {
    // Get policy counts by status
    const statusCounts = await prisma.policy.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    console.log('📋 Policy Status Summary:');
    statusCounts.forEach(item => {
      console.log(`   ${item.status}: ${item._count.status} policies`);
    });

    // Get total counts
    const totalPolicies = await prisma.policy.count();
    const totalChunks = await prisma.policyChunk.count();
    const totalFacts = await prisma.policyFact.count();
    const totalStates = await prisma.state.count();

    console.log('\n📊 Data Summary:');
    console.log(`   Total Policies: ${totalPolicies}`);
    console.log(`   Total Chunks: ${totalChunks}`);
    console.log(`   Total Facts: ${totalFacts}`);
    console.log(`   Total States: ${totalStates}`);

    // Get failed policies details
    const failedPolicies = await prisma.policy.findMany({
      where: { status: 'failed' },
      include: { state: true }
    });

    if (failedPolicies.length > 0) {
      console.log('\n❌ Failed Policies:');
      failedPolicies.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.state.name} - ${policy.title}`);
      });
    }

    // Get processing policies
    const processingPolicies = await prisma.policy.findMany({
      where: { status: 'processing' },
      include: { state: true }
    });

    if (processingPolicies.length > 0) {
      console.log('\n🔄 Currently Processing:');
      processingPolicies.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.state.name} - ${policy.title}`);
      });
    }

    // Get completed policies with facts
    const completedWithFacts = await prisma.policy.findMany({
      where: { 
        status: 'completed',
        facts: {
          some: {}
        }
      },
      include: { 
        state: true,
        _count: {
          select: {
            facts: true,
            chunks: true
          }
        }
      }
    });

    if (completedWithFacts.length > 0) {
      console.log('\n✅ Successfully Processed (with facts):');
      completedWithFacts.forEach((policy, index) => {
        console.log(`   ${index + 1}. ${policy.state.name} - ${policy._count.facts} facts, ${policy._count.chunks} chunks`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
