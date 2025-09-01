import { SetupScript } from '../types/setup.types';
import { DatabaseConnection } from '../config/database.connection';
import * as fs from 'fs';
import * as path from 'path';

interface ConceptData {
  id: string;
  name: string;
  layer: string;
  parentId?: string;
  children?: ConceptData[];
  particles?: { id: string; name: string }[];
}

interface HierarchyData {
  hierarchy: ConceptData;
}

export const importConceptsGraphScript: SetupScript = {
  name: 'import-concepts-graph',
  description: 'Import all concept nodes and establish CONTAINS relationships based on the hierarchical structure',
  execute: async (db: DatabaseConnection) => {
    console.log('🌱 Importing concepts graph...');

    try {
      // Read the hierarchy data from the file
      const filePath = path.join(__dirname, '../resources/4 Layered Mapping.txt');
      const rawData = fs.readFileSync(filePath, 'utf8');
      const hierarchyData: HierarchyData = JSON.parse(rawData);

      // Extract all concepts
      const allConcepts: ConceptData[] = [];
      const relationships: { parentId: string; childId: string }[] = [];

      // Recursive function to traverse the hierarchy and extract concepts
      function traverseHierarchy(node: ConceptData, parentId?: string) {
        // Add the current node to the concepts list
        allConcepts.push({
          id: node.id,
          name: node.name,
          layer: node.layer,
          parentId: parentId
        });

        // If there's a parent, add the relationship
        if (parentId) {
          relationships.push({
            parentId: parentId,
            childId: node.id
          });
        }

        // Process children
        if (node.children) {
          for (const child of node.children) {
            traverseHierarchy(child, node.id);
          }
        }

        // Process particles as children of atoms
        if (node.particles && node.layer === 'Atom') {
          for (const particle of node.particles) {
            allConcepts.push({
              id: particle.id,
              name: particle.name,
              layer: 'Particle',
              parentId: node.id
            });
            
            relationships.push({
              parentId: node.id,
              childId: particle.id
            });
          }
        }
      }

      // Start traversal from the root
      traverseHierarchy(hierarchyData.hierarchy);

      console.log(`  Found ${allConcepts.length} concepts to import`);
      console.log(`  Found ${relationships.length} relationships to establish`);

      // Create all concept nodes
      console.log('  Creating concept nodes...');
      for (const concept of allConcepts) {
        const cypher = `
          MERGE (c:Concept {id: $id})
          SET c.name = $name,
              c.type = $type,
              c.createdAt = datetime()
          RETURN c
        `;

        await db.executeWrite(cypher, {
          id: concept.id,
          name: concept.name,
          type: concept.layer
        });
        
        console.log(`    ✓ Created concept: ${concept.name} (${concept.id})`);
      }

      // Create CONTAINS relationships
      console.log('  Creating CONTAINS relationships...');
      for (const rel of relationships) {
        const cypher = `
          MATCH (parent:Concept {id: $parentId})
          MATCH (child:Concept {id: $childId})
          MERGE (parent)-[:CONTAINS]->(child)
          RETURN parent, child
        `;

        await db.executeWrite(cypher, {
          parentId: rel.parentId,
          childId: rel.childId
        });
        
        console.log(`    ✓ Created relationship: ${rel.parentId} -> ${rel.childId}`);
      }

      console.log('✅ Concepts graph import completed successfully');
    } catch (error) {
      console.error('❌ Error importing concepts graph:', error);
      throw error;
    }
  },
};