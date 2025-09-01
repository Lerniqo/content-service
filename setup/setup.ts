import { DatabaseConnection } from './config/database.connection';
import { SetupConfig, createSetupConfig } from './config/setup.config';
import { SetupScript, SetupResult, SetupOptions } from './types/setup.types';

// Import all scripts
import { cleanupDatabaseScript } from './scripts/cleanup-database';
import { importConceptsGraphScript } from './scripts/import-concepts-graph';
import { validateImportedGraphScript } from './scripts/validate-imported-graph';
import { queryImportedConceptsScript } from './scripts/query-imported-concepts';

export class DatabaseSetup {
  private config: SetupConfig;
  private db: DatabaseConnection;
  private scripts: Map<string, SetupScript> = new Map();

  constructor(config?: Partial<SetupConfig>) {
    this.config = { ...createSetupConfig(), ...config };
    this.db = new DatabaseConnection(this.config.database);
    this.registerScripts();
  }

  private registerScripts(): void {
    this.scripts.set(cleanupDatabaseScript.name, cleanupDatabaseScript);
    this.scripts.set(importConceptsGraphScript.name, importConceptsGraphScript);
    this.scripts.set(validateImportedGraphScript.name, validateImportedGraphScript);
    this.scripts.set(queryImportedConceptsScript.name, queryImportedConceptsScript);
  }

  private resolveDependencies(script: SetupScript, executed: Set<string>): string[] {
    const order: string[] = [];

    if (script.dependsOn) {
      for (const dep of script.dependsOn) {
        if (!executed.has(dep)) {
          const depScript = this.scripts.get(dep);
          if (depScript) {
            order.push(...this.resolveDependencies(depScript, executed));
          }
        }
      }
    }

    if (!executed.has(script.name)) {
      order.push(script.name);
      executed.add(script.name);
    }

    return order;
  }

  private getExecutionOrder(requestedScripts?: string[]): string[] {
    const executed = new Set<string>();
    const order: string[] = [];

    const scriptsToExecute = requestedScripts || Array.from(this.scripts.keys());

    for (const scriptName of scriptsToExecute) {
      const script = this.scripts.get(scriptName);
      if (script) {
        order.push(...this.resolveDependencies(script, executed));
      }
    }

    return [...new Set(order)]; // Remove duplicates while preserving order
  }

  async execute(options: SetupOptions = {}): Promise<SetupResult[]> {
    const results: SetupResult[] = [];
    const startTime = new Date();

    console.log('🚀 Starting database setup...');
    console.log(`📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);

    try {
      // Connect to database
      await this.db.connect();

      // Get execution order
      const executionOrder = this.getExecutionOrder(options.scripts);

      if (options.verbose) {
        console.log('📋 Execution order:', executionOrder);
      }

      // Execute scripts
      for (const scriptName of executionOrder) {
        const script = this.scripts.get(scriptName);
        if (!script) continue;

        const scriptStartTime = Date.now();

        try {
          console.log(`\n▶️  Executing: ${script.name}`);
          console.log(`   ${script.description}`);

          await script.execute(this.db);

          const duration = Date.now() - scriptStartTime;
          results.push({
            scriptName,
            success: true,
            duration,
          });

          console.log(`✅ Completed: ${script.name} (${duration}ms)`);

        } catch (error) {
          const duration = Date.now() - scriptStartTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          results.push({
            scriptName,
            success: false,
            duration,
            error: errorMessage,
          });

          console.error(`❌ Failed: ${script.name} (${duration}ms)`);
          console.error(`   Error: ${errorMessage}`);

          if (!options.continueOnError) {
            throw error;
          }
        }
      }

      console.log('\n🎉 Database setup completed!');
      console.log(`⏱️  Total time: ${Date.now() - startTime.getTime()}ms`);

    } finally {
      await this.db.disconnect();
    }

    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.connect();
      const isHealthy = await this.db.healthCheck();
      await this.db.disconnect();
      return isHealthy;
    } catch {
      return false;
    }
  }

  getAvailableScripts(): string[] {
    return Array.from(this.scripts.keys());
  }

  getScriptInfo(name: string): SetupScript | undefined {
    return this.scripts.get(name);
  }
}
