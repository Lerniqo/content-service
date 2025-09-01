import { SetupScript } from '../types/setup.types';
import { DatabaseConnection } from '../config/database.connection';

export const validateImportedGraphScript: SetupScript = {
  name: 'validate-imported-graph',
  description: 'Validate the imported concepts graph structure',
  execute: async (db: DatabaseConnection) => {
    console.log('🔍 Validating imported concepts graph...');

    // Count total concepts
    const conceptCountQuery = `
      MATCH (c:Concept)
      RETURN count(c) as count
    `;
    
    const conceptCountResult = await db.executeRead(conceptCountQuery);
    const conceptCount = conceptCountResult[0].count.toNumber();
    console.log(`  Total concepts: ${conceptCount}`);

    // Count relationships
    const relationshipCountQuery = `
      MATCH (c1:Concept)-[:CONTAINS]->(c2:Concept)
      RETURN count(*) as count
    `;
    
    const relationshipCountResult = await db.executeRead(relationshipCountQuery);
    const relationshipCount = relationshipCountResult[0].count.toNumber();
    console.log(`  Total CONTAINS relationships: ${relationshipCount}`);

    // Check root concept
    const rootConceptQuery = `
      MATCH (c:Concept {id: 'OLM001'})
      RETURN c.name as name, c.type as type
    `;
    
    const rootConceptResult = await db.executeRead(rootConceptQuery);
    if (rootConceptResult.length > 0) {
      console.log(`  Root concept: ${rootConceptResult[0].name} (${rootConceptResult[0].type})`);
    } else {
      console.log('  ❌ Root concept not found');
    }

    // Check concept types distribution
    const conceptTypesQuery = `
      MATCH (c:Concept)
      RETURN c.type as type, count(c) as count
      ORDER BY count DESC
    `;
    
    const conceptTypesResult = await db.executeRead(conceptTypesQuery);
    console.log('  Concept types distribution:');
    conceptTypesResult.forEach(row => {
      console.log(`    ${row.type}: ${row.count.toNumber()}`);
    });

    // Check hierarchy depth
    const depthQuery = `
      MATCH p = (root:Concept {id: 'OLM001'})-[:CONTAINS*]->(leaf:Concept)
      WHERE NOT (leaf)-[:CONTAINS]->()
      RETURN length(p) as depth
      ORDER BY depth DESC
      LIMIT 1
    `;
    
    const depthResult = await db.executeRead(depthQuery);
    if (depthResult.length > 0) {
      console.log(`  Maximum hierarchy depth: ${depthResult[0].depth.toNumber()}`);
    }

    console.log('✅ Graph validation completed');
  },
};