import { SetupScript } from '../types/setup.types';
import { DatabaseConnection } from '../config/database.connection';

export const cleanupDatabaseScript: SetupScript = {
  name: 'cleanup-database',
  description: 'Remove all existing nodes and relationships from the database',
  execute: async (db: DatabaseConnection) => {
    console.log('🧹 Cleaning up database...');

    // Delete all relationships first
    await db.executeWrite('MATCH ()-[r]-() DELETE r');
    console.log('  ✓ Deleted all relationships');

    // Delete all nodes
    await db.executeWrite('MATCH (n) DELETE n');
    console.log('  ✓ Deleted all nodes');

    console.log('✅ Database cleanup completed');
  },
};
