#!/usr/bin/env node

import { DatabaseSetup } from './setup';
import { createSetupConfig } from './config/setup.config';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const setup = new DatabaseSetup();

  switch (command) {
    case 'run':
      const scriptNames = args.slice(1);
      const options = {
        scripts: scriptNames.length > 0 ? scriptNames : undefined,
        continueOnError: process.env.CONTINUE_ON_ERROR === 'true',
        verbose: process.env.VERBOSE === 'true',
      };

      try {
        const results = await setup.execute(options);
        const failed = results.filter(r => !r.success);

        if (failed.length > 0) {
          console.error(`\n❌ ${failed.length} script(s) failed:`);
          failed.forEach(f => console.error(`   - ${f.scriptName}: ${f.error}`));
          process.exit(1);
        } else {
          console.log(`\n✅ All ${results.length} scripts executed successfully!`);
        }
      } catch (error) {
        console.error('💥 Setup failed:', error);
        process.exit(1);
      }
      break;

    case 'list':
      console.log('📋 Available scripts:');
      setup.getAvailableScripts().forEach(name => {
        const script = setup.getScriptInfo(name);
        if (script) {
          console.log(`  - ${name}: ${script.description}`);
          if (script.dependsOn) {
            console.log(`    Dependencies: ${script.dependsOn.join(', ')}`);
          }
        }
      });
      break;

    case 'health':
      const isHealthy = await setup.healthCheck();
      if (isHealthy) {
        console.log('✅ Database connection is healthy');
      } else {
        console.log('❌ Database connection is unhealthy');
        process.exit(1);
      }
      break;

    case 'config':
      const config = createSetupConfig();
      console.log('⚙️  Current configuration:');
      console.log(JSON.stringify(config, null, 2));
      break;

    default:
      console.log('Usage: setup <command>');
      console.log('');
      console.log('Commands:');
      console.log('  run [script...]    Run setup scripts (runs all if no scripts specified)');
      console.log('  list               List all available scripts');
      console.log('  health             Check database connection health');
      console.log('  config             Show current configuration');
      console.log('');
      console.log('Environment variables:');
      console.log('  NEO4J_URI          Neo4j connection URI');
      console.log('  NEO4J_USERNAME     Neo4j username');
      console.log('  NEO4J_PASSWORD     Neo4j password');
      console.log('  DROP_EXISTING_DATA Whether to drop existing data before seeding');
      console.log('  SEED_DATA          Whether to seed data (default: true)');
      console.log('  CONTINUE_ON_ERROR  Whether to continue on script errors');
      console.log('  VERBOSE            Enable verbose logging');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

export { DatabaseSetup } from './setup';
export { createSetupConfig } from './config/setup.config';
export type { SetupConfig, DatabaseConfig } from './config/setup.config';
export type { SetupScript, SetupResult, SetupOptions } from './types/setup.types';
