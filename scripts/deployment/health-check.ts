#!/usr/bin/env node
/**
 * Health Check Script
 * Quick validation of application health
 */

async function healthCheck(baseUrl: string): Promise<void> {
  console.log(`🏥 Running health check on ${baseUrl}\n`);

  try {
    // Basic health endpoint
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log('✅ Health endpoint:', healthData);

    // Database connectivity
    try {
      const dbResponse = await fetch(`${baseUrl}/api/health/database`, {
        signal: AbortSignal.timeout(10000)
      });

      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        console.log('✅ Database:', dbData);
      } else {
        console.log('⚠️  Database health endpoint returned:', dbResponse.status);
      }
    } catch (dbError) {
      console.log('⚠️  Database health check unavailable');
    }

    console.log('\n✅ Health check passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Health check failed:', (error as Error).message);
    process.exit(1);
  }
}

const url = process.argv[2] || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
healthCheck(url);
