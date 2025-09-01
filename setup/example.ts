import { DatabaseSetup } from '../setup';

async function exampleUsage() {
  console.log('🚀 Database Setup Example\n');

  // Create setup instance with default configuration
  const setup = new DatabaseSetup();

  try {
    // Check database health first
    console.log('🔍 Checking database health...');
    const isHealthy = await setup.healthCheck();

    if (!isHealthy) {
      console.error('❌ Database is not healthy. Please check your connection.');
      return;
    }

    console.log('✅ Database is healthy\n');

    // List available scripts
    console.log('📋 Available scripts:');
    setup.getAvailableScripts().forEach(name => {
      const script = setup.getScriptInfo(name);
      if (script) {
        console.log(`  - ${name}: ${script.description}`);
      }
    });

    console.log('\n▶️  Running full setup...\n');

    // Run all scripts with verbose output
    const results = await setup.execute({
      verbose: true,
      continueOnError: false,
    });

    // Display results
    console.log('\n📊 Setup Results:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${status} ${result.scriptName}: ${duration}`);

      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const successful = results.filter(r => r.success).length;
    const total = results.length;
    console.log(`\n🎯 Summary: ${successful}/${total} scripts completed successfully`);

  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  exampleUsage().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}
