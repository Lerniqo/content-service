const neo4j = require("neo4j-driver");

// Update these credentials to match your Neo4j instance
const driver = neo4j.driver(
  "neo4j+s://7e6f4ad1.databases.neo4j.io",
  neo4j.auth.basic("neo4j", "aVhFUcZeF0Jy-EWYAyTzcsHt-vrdWEJYyVYpi3ErF90"),
  {
    maxConnectionPoolSize: 100,
    connectionTimeout: 60000,
    maxTransactionRetryTime: 30000
  }
);

async function addLearningPathSchema() {
  const session = driver.session();

  try {
    console.log("🚀 Adding Learning Path schema to Neo4j...\n");

    // Create indexes and constraints for User nodes
    console.log("📌 Creating User node constraints and indexes...");
    await session.run(
      "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE"
    );
    console.log("  ✅ Created unique constraint on User.id");
    
    await session.run(
      "CREATE INDEX user_id IF NOT EXISTS FOR (u:User) ON (u.id)"
    );
    console.log("  ✅ Created index on User.id");

    // Create indexes and constraints for LearningPath nodes
    console.log("\n📌 Creating LearningPath node constraints and indexes...");
    await session.run(
      "CREATE CONSTRAINT learningpath_id_unique IF NOT EXISTS FOR (lp:LearningPath) REQUIRE lp.id IS UNIQUE"
    );
    console.log("  ✅ Created unique constraint on LearningPath.id");
    
    await session.run(
      "CREATE INDEX learningpath_id IF NOT EXISTS FOR (lp:LearningPath) ON (lp.id)"
    );
    console.log("  ✅ Created index on LearningPath.id");
    
    await session.run(
      "CREATE INDEX learningpath_status IF NOT EXISTS FOR (lp:LearningPath) ON (lp.status)"
    );
    console.log("  ✅ Created index on LearningPath.status");
    
    await session.run(
      "CREATE INDEX learningpath_difficultyLevel IF NOT EXISTS FOR (lp:LearningPath) ON (lp.difficultyLevel)"
    );
    console.log("  ✅ Created index on LearningPath.difficultyLevel");

    // Create indexes and constraints for LearningPathStep nodes
    console.log("\n📌 Creating LearningPathStep node constraints and indexes...");
    await session.run(
      "CREATE CONSTRAINT learningstep_id_unique IF NOT EXISTS FOR (s:LearningPathStep) REQUIRE s.id IS UNIQUE"
    );
    console.log("  ✅ Created unique constraint on LearningPathStep.id");
    
    await session.run(
      "CREATE INDEX learningstep_id IF NOT EXISTS FOR (s:LearningPathStep) ON (s.id)"
    );
    console.log("  ✅ Created index on LearningPathStep.id");
    
    await session.run(
      "CREATE INDEX learningstep_stepNumber IF NOT EXISTS FOR (s:LearningPathStep) ON (s.stepNumber)"
    );
    console.log("  ✅ Created index on LearningPathStep.stepNumber");

    console.log("\n✅ Learning Path schema added successfully!");
    console.log("\n📊 Summary:");
    console.log("  - Node types: User, LearningPath, LearningPathStep");
    console.log("  - Relationships: HAS_LEARNING_PATH, HAS_STEP");
    console.log("  - Unique constraints: 3");
    console.log("  - Indexes: 6");

  } catch (error) {
    console.error("\n❌ Error adding Learning Path schema:", error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
addLearningPathSchema()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
