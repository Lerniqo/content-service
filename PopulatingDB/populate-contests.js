const neo4j = require("neo4j-driver");
const { v4: uuidv4 } = require("uuid");

const driver = neo4j.driver(
  "neo4j+s://7e6f4ad1.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "aVhFUcZeF0Jy-EWYAyTzcsHt-vrdWEJYyVYpi3ErF90"),
  {
    maxConnectionPoolSize: 100,
    connectionTimeout: 60000,
    maxTransactionRetryTime: 30000
  }
);

async function populateContests() {
  const session = driver.session();

  try {
    console.log("🚀 Starting Contest schema and sample data population...\n");

    // ============================================
    // STEP 1: Create Indexes and Constraints
    // ============================================
    console.log("📊 Creating indexes and constraints for Contest nodes...");
    
    // Contest node constraints and indexes
    await session.run(
      "CREATE CONSTRAINT contest_id_unique IF NOT EXISTS FOR (c:Contest) REQUIRE c.contestId IS UNIQUE"
    );
    await session.run(
      "CREATE INDEX contest_id IF NOT EXISTS FOR (c:Contest) ON (c.contestId)"
    );
    await session.run(
      "CREATE INDEX contest_name IF NOT EXISTS FOR (c:Contest) ON (c.contestName)"
    );
    await session.run(
      "CREATE INDEX contest_startDate IF NOT EXISTS FOR (c:Contest) ON (c.startDate)"
    );
    await session.run(
      "CREATE INDEX contest_endDate IF NOT EXISTS FOR (c:Contest) ON (c.endDate)"
    );
    
    console.log("✅ Contest indexes and constraints created");

    // Task node constraints and indexes
    console.log("📊 Creating indexes and constraints for Task nodes...");
    await session.run(
      "CREATE CONSTRAINT task_id_unique IF NOT EXISTS FOR (t:Task) REQUIRE t.taskId IS UNIQUE"
    );
    await session.run(
      "CREATE INDEX task_id IF NOT EXISTS FOR (t:Task) ON (t.taskId)"
    );
    await session.run(
      "CREATE INDEX task_type IF NOT EXISTS FOR (t:Task) ON (t.type)"
    );
    
    console.log("✅ Task indexes and constraints created");

    // ContestParticipation node indexes (for tracking user participation)
    console.log("📊 Creating indexes for ContestParticipation tracking...");
    await session.run(
      "CREATE INDEX participation_userId IF NOT EXISTS FOR (p:ContestParticipation) ON (p.userId)"
    );
    await session.run(
      "CREATE INDEX participation_status IF NOT EXISTS FOR (p:ContestParticipation) ON (p.status)"
    );
    
    console.log("✅ ContestParticipation indexes created\n");

    // ============================================
    // STEP 2: Create Sample Contest Data
    // ============================================
    console.log("📝 Creating sample contest data...\n");

    // Sample Contest 1: Mathematics Championship
    const contest1Id = uuidv4();
    const contest1StartDate = new Date('2025-11-01T00:00:00Z').toISOString();
    const contest1EndDate = new Date('2025-11-30T23:59:59Z').toISOString();
    const now = new Date().toISOString();

    const contest1Query = `
      CREATE (c:Contest {
        contestId: $contestId,
        contestName: $contestName,
        subTitle: $subTitle,
        startDate: $startDate,
        endDate: $endDate,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      WITH c
      UNWIND $tasks AS task
      CREATE (t:Task {
        taskId: task.taskId,
        title: task.title,
        type: task.type,
        description: task.description,
        goal: task.goal
      })
      CREATE (c)-[:HAS_TASK]->(t)
      RETURN c.contestId AS contestId, c.contestName AS contestName, 
             count(t) AS taskCount
    `;

    const contest1Tasks = [
      {
        taskId: uuidv4(),
        title: "Complete 5 One-on-One Battles",
        type: "1Vs1_tasks",
        description: "Win 5 one-on-one battles to complete this task",
        goal: 5
      },
      {
        taskId: uuidv4(),
        title: "Answer 20 AI Questions",
        type: "AI_Questions_tasks",
        description: "Successfully answer 20 AI-generated questions",
        goal: 20
      },
      {
        taskId: uuidv4(),
        title: "Win 3 Consecutive Battles",
        type: "1Vs1_tasks",
        description: "Achieve a winning streak of 3 consecutive battles",
        goal: 3
      }
    ];

    const result1 = await session.run(contest1Query, {
      contestId: contest1Id,
      contestName: "Mathematics Championship 2025",
      subTitle: "Test your mathematics skills and compete with peers",
      startDate: contest1StartDate,
      endDate: contest1EndDate,
      createdAt: now,
      updatedAt: now,
      tasks: contest1Tasks
    });

    console.log(`✅ Created Contest: ${result1.records[0].get('contestName')}`);
    console.log(`   Contest ID: ${result1.records[0].get('contestId')}`);
    console.log(`   Tasks: ${result1.records[0].get('taskCount').toInt()}\n`);

    // Sample Contest 2: Science Quiz Challenge
    const contest2Id = uuidv4();
    const contest2StartDate = new Date('2025-12-01T00:00:00Z').toISOString();
    const contest2EndDate = new Date('2025-12-15T23:59:59Z').toISOString();

    const contest2Tasks = [
      {
        taskId: uuidv4(),
        title: "Complete 10 AI Questions",
        type: "AI_Questions_tasks",
        description: "Answer 10 science-related AI questions correctly",
        goal: 10
      },
      {
        taskId: uuidv4(),
        title: "Win 2 One-on-One Matches",
        type: "1Vs1_tasks",
        description: "Win 2 one-on-one science quiz matches",
        goal: 2
      }
    ];

    const result2 = await session.run(contest1Query, {
      contestId: contest2Id,
      contestName: "Science Quiz Challenge",
      subTitle: "Explore scientific concepts through competitive quizzing",
      startDate: contest2StartDate,
      endDate: contest2EndDate,
      createdAt: now,
      updatedAt: now,
      tasks: contest2Tasks
    });

    console.log(`✅ Created Contest: ${result2.records[0].get('contestName')}`);
    console.log(`   Contest ID: ${result2.records[0].get('contestId')}`);
    console.log(`   Tasks: ${result2.records[0].get('taskCount').toInt()}\n`);

    // Sample Contest 3: Speed Challenge (Past Contest for Testing)
    const contest3Id = uuidv4();
    const contest3StartDate = new Date('2025-10-01T00:00:00Z').toISOString();
    const contest3EndDate = new Date('2025-10-15T23:59:59Z').toISOString();

    const contest3Tasks = [
      {
        taskId: uuidv4(),
        title: "Quick Fire Round",
        type: "AI_Questions_tasks",
        description: "Answer 15 questions in under 10 minutes",
        goal: 15
      },
      {
        taskId: uuidv4(),
        title: "Speed Battles",
        type: "1Vs1_tasks",
        description: "Win 4 quick battles",
        goal: 4
      },
      {
        taskId: uuidv4(),
        title: "Master Challenge",
        type: "AI_Questions_tasks",
        description: "Answer 30 advanced questions correctly",
        goal: 30
      }
    ];

    const result3 = await session.run(contest1Query, {
      contestId: contest3Id,
      contestName: "Speed Challenge 2025",
      subTitle: "Test your speed and accuracy under pressure",
      startDate: contest3StartDate,
      endDate: contest3EndDate,
      createdAt: now,
      updatedAt: now,
      tasks: contest3Tasks
    });

    console.log(`✅ Created Contest: ${result3.records[0].get('contestName')}`);
    console.log(`   Contest ID: ${result3.records[0].get('contestId')}`);
    console.log(`   Tasks: ${result3.records[0].get('taskCount').toInt()}\n`);

    // ============================================
    // STEP 3: Verify Created Data
    // ============================================
    console.log("🔍 Verifying created contests...\n");
    
    const verifyQuery = `
      MATCH (c:Contest)
      OPTIONAL MATCH (c)-[:HAS_TASK]->(t:Task)
      RETURN c.contestId AS contestId,
             c.contestName AS contestName,
             c.startDate AS startDate,
             c.endDate AS endDate,
             count(t) AS taskCount
      ORDER BY c.startDate
    `;

    const verifyResult = await session.run(verifyQuery);
    
    console.log("📋 Contest Summary:");
    console.log("==========================================");
    verifyResult.records.forEach((record, index) => {
      console.log(`\n${index + 1}. ${record.get('contestName')}`);
      console.log(`   Contest ID: ${record.get('contestId')}`);
      console.log(`   Start: ${record.get('startDate')}`);
      console.log(`   End: ${record.get('endDate')}`);
      console.log(`   Tasks: ${record.get('taskCount').toInt()}`);
    });

    // ============================================
    // STEP 4: Display Relationship Types
    // ============================================
    console.log("\n\n📊 Relationship Types Created:");
    console.log("==========================================");
    console.log("1. HAS_TASK: Contest -> Task");
    console.log("   Description: Links a contest to its tasks");
    console.log("   Usage: (c:Contest)-[:HAS_TASK]->(t:Task)");
    
    console.log("\n2. PARTICIPATES_IN: User -> Contest");
    console.log("   Description: Links a user to contests they're participating in");
    console.log("   Usage: (u:User)-[:PARTICIPATES_IN]->(c:Contest)");
    
    console.log("\n3. COMPLETED_TASK: User -> Task");
    console.log("   Description: Tracks when a user completes a task");
    console.log("   Usage: (u:User)-[:COMPLETED_TASK {completedAt, progress}]->(t:Task)");

    // ============================================
    // STEP 5: Display Node Types
    // ============================================
    console.log("\n\n📦 Node Types Created:");
    console.log("==========================================");
    console.log("\n1. Contest Node");
    console.log("   Properties:");
    console.log("   - contestId: String (Unique)");
    console.log("   - contestName: String");
    console.log("   - subTitle: String (Optional)");
    console.log("   - startDate: DateTime");
    console.log("   - endDate: DateTime");
    console.log("   - createdAt: DateTime");
    console.log("   - updatedAt: DateTime");
    
    console.log("\n2. Task Node");
    console.log("   Properties:");
    console.log("   - taskId: String (Unique)");
    console.log("   - title: String");
    console.log("   - type: String (1Vs1_tasks | AI_Questions_tasks)");
    console.log("   - description: String");
    console.log("   - goal: Integer");
    
    console.log("\n3. ContestParticipation Node (Optional)");
    console.log("   Properties:");
    console.log("   - userId: String");
    console.log("   - contestId: String");
    console.log("   - status: String (registered | in_progress | completed)");
    console.log("   - joinedAt: DateTime");
    console.log("   - score: Integer");

    console.log("\n\n✅ Contest schema and sample data populated successfully!");
    console.log("==========================================\n");

  } catch (error) {
    console.error("❌ Error populating contest data:", error);
    throw error;
  } finally {
    await session.close();
  }
}

async function main() {
  try {
    await populateContests();
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await driver.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
main();
