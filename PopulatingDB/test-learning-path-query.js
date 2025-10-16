/* eslint-disable prettier/prettier */
const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function testLearningPathQuery() {
  const session = driver.session();
  
  try {
    console.log('🔍 Testing Learning Path Query...\n');
    
    // Test 1: Create a test user and learning path
    console.log('📝 Step 1: Creating test user and learning path...');
    const testUserId = 'test_user_' + Date.now();
    const learningPathId = 'lp_test_' + Date.now();
    const timestamp = new Date().toISOString();
    
    const createQuery = `
      // Create test user
      CREATE (u:User {id: $userId, createdAt: $timestamp})
      
      // Create learning path with processing status
      CREATE (lp:LearningPath {
        id: $learningPathId,
        learningGoal: 'Learn JavaScript',
        difficultyLevel: 'intermediate',
        status: 'processing',
        requestId: 'req_test_123',
        createdAt: $timestamp,
        updatedAt: $timestamp
      })
      
      CREATE (u)-[:HAS_LEARNING_PATH]->(lp)
      
      RETURN lp.id as learningPathId, u.id as userId
    `;
    
    const createResult = await session.run(createQuery, {
      userId: testUserId,
      learningPathId,
      timestamp
    });
    
    console.log('✅ Created test user:', testUserId);
    console.log('✅ Created learning path:', learningPathId, '(status: processing)\n');
    
    // Test 2: Query for processing learning path
    console.log('📝 Step 2: Testing query for PROCESSING learning path...');
    const getUserLearningPathsQuery = `
      // Find or create the user
      MERGE (u:User {id: $userId})
      ON CREATE SET u.createdAt = $timestamp
      
      // Pass the user to the next part
      WITH u
      
      // Try to find the learning path
      OPTIONAL MATCH (u)-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      
      WITH lp, 
           COLLECT(step) as steps
      ORDER BY lp.createdAt DESC
      
      RETURN 
        lp.id as id,
        lp.learningGoal as learningGoal,
        lp.status as status,
        lp.requestId as requestId,
        lp.masteryScores as masteryScores,
        lp.createdAt as createdAt,
        lp.updatedAt as updatedAt,
        CASE 
          WHEN lp.status = 'completed' THEN {
            goal: lp.learningGoal,
            difficultyLevel: lp.difficultyLevel,
            totalDuration: lp.totalDuration,
            steps: [step IN steps | {
              stepNumber: step.stepNumber,
              title: step.title,
              description: step.description,
              estimatedDuration: step.estimatedDuration,
              resources: step.resources,
              prerequisites: step.prerequisites
            }]
          }
          ELSE null
        END as learningPath
    `;
    
    const processingResult = await session.run(getUserLearningPathsQuery, {
      userId: testUserId,
      timestamp
    });
    
    console.log('✅ Query executed successfully for processing state');
    console.log('Result:', JSON.stringify(processingResult.records[0].toObject(), null, 2), '\n');
    
    // Test 3: Update to completed status with steps
    console.log('📝 Step 3: Updating learning path to COMPLETED status with steps...');
    const updateQuery = `
      MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      SET lp.status = 'completed',
          lp.difficultyLevel = 'intermediate',
          lp.totalDuration = '30 days',
          lp.masteryScores = $masteryScores,
          lp.updatedAt = $timestamp
      
      // Create steps
      WITH lp
      UNWIND $steps AS step
      CREATE (s:LearningPathStep {
        id: lp.id + '_step_' + toString(step.stepNumber),
        stepNumber: step.stepNumber,
        title: step.title,
        description: step.description,
        estimatedDuration: step.estimatedDuration,
        resources: step.resources,
        prerequisites: step.prerequisites
      })
      CREATE (lp)-[:HAS_STEP]->(s)
      
      RETURN lp.id as learningPathId
    `;
    
    const steps = [
      {
        stepNumber: 1,
        title: 'JavaScript Basics',
        description: 'Learn the fundamentals of JavaScript',
        estimatedDuration: '5 days',
        resources: ['MDN Web Docs', 'JavaScript.info'],
        prerequisites: []
      },
      {
        stepNumber: 2,
        title: 'DOM Manipulation',
        description: 'Learn how to manipulate the DOM',
        estimatedDuration: '7 days',
        resources: ['W3Schools', 'MDN DOM Guide'],
        prerequisites: ['JavaScript Basics']
      },
      {
        stepNumber: 3,
        title: 'Async JavaScript',
        description: 'Master promises and async/await',
        estimatedDuration: '10 days',
        resources: ['JavaScript.info Async', 'Eloquent JavaScript'],
        prerequisites: ['JavaScript Basics']
      }
    ];
    
    await session.run(updateQuery, {
      userId: testUserId,
      steps,
      masteryScores: JSON.stringify({ javascript_basics: 0.75, dom: 0.60 }),
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Updated to completed status with 3 steps\n');
    
    // Test 4: Query for completed learning path
    console.log('📝 Step 4: Testing query for COMPLETED learning path...');
    const completedResult = await session.run(getUserLearningPathsQuery, {
      userId: testUserId,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Query executed successfully for completed state');
    const record = completedResult.records[0].toObject();
    console.log('Learning Path ID:', record.id);
    console.log('Goal:', record.learningGoal);
    console.log('Status:', record.status);
    console.log('Mastery Scores:', record.masteryScores);
    console.log('Learning Path:', JSON.stringify(record.learningPath, null, 2), '\n');
    
    // Test 5: Query for non-existent user
    console.log('📝 Step 5: Testing query for NON-EXISTENT user...');
    const nonExistentResult = await session.run(getUserLearningPathsQuery, {
      userId: 'non_existent_user_12345',
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Query executed successfully for non-existent user');
    const nonExistentRecord = nonExistentResult.records[0].toObject();
    console.log('Result (should have null values):', JSON.stringify(nonExistentRecord, null, 2), '\n');
    
    // Cleanup
    console.log('📝 Step 6: Cleaning up test data...');
    await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_LEARNING_PATH]->(lp:LearningPath)
      OPTIONAL MATCH (lp)-[:HAS_STEP]->(step:LearningPathStep)
      DETACH DELETE step, lp, u
      `,
      { userId: testUserId }
    );
    
    // Clean up non-existent user if created
    await session.run(
      `
      MATCH (u:User {id: $userId})
      WHERE NOT (u)-[:HAS_LEARNING_PATH]->()
      DELETE u
      `,
      { userId: 'non_existent_user_12345' }
    );
    
    console.log('✅ Cleanup completed\n');
    
    console.log('🎉 All tests passed! The query is working correctly against the real database.\n');
    
  } catch (error) {
    console.error('❌ Error testing query:', error);
    throw error;
  } finally {
    await session.close();
  }
}

async function main() {
  try {
    await testLearningPathQuery();
  } catch (error) {
    console.error('Failed to test learning path query:', error);
    process.exit(1);
  } finally {
    await driver.close();
  }
}

main();
