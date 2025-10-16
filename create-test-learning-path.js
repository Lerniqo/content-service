const neo4j = require("neo4j-driver");

const driver = neo4j.driver(
  "neo4j+s://7e6f4ad1.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "aVhFUcZeF0Jy-EWYAyTzcsHt-vrdWEJYyVYpi3ErF90")
);

async function createTestLearningPath() {
  const session = driver.session();
  
  try {
    console.log("Creating test learning path for mock-admin-123...");
    
    // Create a test learning path
    const result = await session.run(`
      // Create or find the user
      MERGE (u:User {id: $userId})
      ON CREATE SET u.createdAt = $timestamp
      
      WITH u
      
      // Delete any existing learning path for this user
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(existingLp:LearningPath)
      OPTIONAL MATCH (existingLp)-[:HAS_STEP]->(existingStep:LearningPathStep)
      DETACH DELETE existingLp, existingStep
      
      WITH u
      
      // Create new learning path
      CREATE (lp:LearningPath {
        id: $learningPathId,
        learningGoal: $learningGoal,
        status: 'completed',
        requestId: $requestId,
        difficultyLevel: 'beginner',
        totalDuration: '45 minutes',
        createdAt: $timestamp,
        updatedAt: $timestamp
      })
      
      // Create learning path steps
      CREATE (step1:LearningPathStep {
        id: $step1Id,
        stepNumber: 1,
        title: 'Introduction to Circles',
        description: 'Learn the basic definition and properties of a circle',
        estimatedDuration: '15 minutes',
        resources: '["https://example.com/circle-intro"]',
        prerequisites: '[]'
      })
      
      CREATE (step2:LearningPathStep {
        id: $step2Id,
        stepNumber: 2,
        title: 'Circle Components',
        description: 'Understand radius, diameter, circumference, and area',
        estimatedDuration: '20 minutes',
        resources: '["https://example.com/circle-components"]',
        prerequisites: '["Introduction to Circles"]'
      })
      
      CREATE (step3:LearningPathStep {
        id: $step3Id,
        stepNumber: 3,
        title: 'Circle Formulas',
        description: 'Practice calculating area and circumference',
        estimatedDuration: '10 minutes',
        resources: '["https://example.com/circle-formulas"]',
        prerequisites: '["Circle Components"]'
      })
      
      // Create relationships
      CREATE (u)-[:HAS_LEARNING_PATH]->(lp)
      CREATE (lp)-[:HAS_STEP]->(step1)
      CREATE (lp)-[:HAS_STEP]->(step2)
      CREATE (lp)-[:HAS_STEP]->(step3)
      
      RETURN lp.id as learningPathId, u.id as userId
    `, {
      userId: 'mock-admin-123',
      learningPathId: 'lp_test123',
      requestId: 'req_test123',
      learningGoal: 'explain what is circle',
      step1Id: 'step_1',
      step2Id: 'step_2',
      step3Id: 'step_3',
      timestamp: new Date().toISOString()
    });

    console.log("✅ Test learning path created successfully!");
    console.log("Learning Path ID:", result.records[0].get('learningPathId'));
    console.log("User ID:", result.records[0].get('userId'));
    
  } catch (error) {
    console.error("❌ Error creating test learning path:", error);
  } finally {
    await session.close();
    await driver.close();
  }
}

createTestLearningPath();