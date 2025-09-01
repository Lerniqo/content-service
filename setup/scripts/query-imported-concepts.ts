import { SetupScript } from '../types/setup.types';
import { DatabaseConnection } from '../config/database.connection';

export const queryImportedConceptsScript: SetupScript = {
  name: 'query-imported-concepts',
  description: 'Query and display information about imported concepts',
  execute: async (db: DatabaseConnection) => {
    console.log('🔍 Querying imported concepts...');

    // Query the root concept
    console.log('\n1. Root Concept:');
    const rootQuery = `
      MATCH (c:Concept {id: 'OLM001'})
      RETURN c.id as id, c.name as name, c.type as type
    `;
    
    const rootResult = await db.executeRead(rootQuery);
    if (rootResult.length > 0) {
      console.log(`   ID: ${rootResult[0].id}`);
      console.log(`   Name: ${rootResult[0].name}`);
      console.log(`   Type: ${rootResult[0].type}`);
    }

    // Query the first level children (Matters)
    console.log('\n2. First Level Concepts (Matters):');
    const mattersQuery = `
      MATCH (root:Concept {id: 'OLM001'})-[:CONTAINS]->(matter:Concept)
      WHERE matter.type = 'Matter'
      RETURN matter.id as id, matter.name as name, matter.type as type
      ORDER BY matter.name
    `;
    
    const mattersResult = await db.executeRead(mattersQuery);
    mattersResult.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.name} (${row.id}) - ${row.type}`);
    });

    // Query a specific molecule and its children
    console.log('\n3. Fractions Molecule and its Children:');
    const fractionsQuery = `
      MATCH (mol:Concept {id: 'MOL001'})
      OPTIONAL MATCH (mol)-[:CONTAINS]->(atom:Concept)
      RETURN mol.id as molId, mol.name as molName, mol.type as molType,
             collect({id: atom.id, name: atom.name, type: atom.type}) as atoms
    `;
    
    const fractionsResult = await db.executeRead(fractionsQuery);
    if (fractionsResult.length > 0) {
      const row = fractionsResult[0];
      console.log(`   Molecule: ${row.molName} (${row.molId}) - ${row.molType}`);
      console.log('   Atoms:');
      (row.atoms as any[]).forEach((atom, index) => {
        console.log(`     ${index + 1}. ${atom.name} (${atom.id}) - ${atom.type}`);
      });
    }

    // Query a specific atom and its particles
    console.log('\n4. Multiplication of Fractions Atom and its Particles:');
    const atomQuery = `
      MATCH (atom:Concept {id: 'ATM001'})
      OPTIONAL MATCH (atom)-[:CONTAINS]->(particle:Concept)
      RETURN atom.id as atomId, atom.name as atomName, atom.type as atomType,
             collect({id: particle.id, name: particle.name, type: particle.type}) as particles
    `;
    
    const atomResult = await db.executeRead(atomQuery);
    if (atomResult.length > 0) {
      const row = atomResult[0];
      console.log(`   Atom: ${row.atomName} (${row.atomId}) - ${row.atomType}`);
      console.log('   Particles:');
      (row.particles as any[]).forEach((particle, index) => {
        console.log(`     ${index + 1}. ${particle.name} (${particle.id}) - ${particle.type}`);
      });
    }

    // Show concept hierarchy for a path
    console.log('\n5. Concept Hierarchy Path Example:');
    const hierarchyQuery = `
      MATCH path = (root:Concept {id: 'OLM001'})-[:CONTAINS*]->(leaf:Concept {id: 'PAR001'})
      UNWIND nodes(path) as node
      RETURN collect({id: node.id, name: node.name, type: node.type}) as hierarchy
    `;
    
    const hierarchyResult = await db.executeRead(hierarchyQuery);
    if (hierarchyResult.length > 0) {
      const hierarchy = hierarchyResult[0].hierarchy as any[];
      hierarchy.forEach((concept, level) => {
        const indent = '  '.repeat(level);
        console.log(`${indent}${concept.name} (${concept.id}) - ${concept.type}`);
      });
    }

    console.log('\n✅ Query completed successfully');
  },
};