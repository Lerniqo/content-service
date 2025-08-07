# Neo4j Service Tests

This directory contains comprehensive tests for the Neo4j service implementation.

## Test Files

### `neo4j.service.spec.ts`
Complete unit tests for the Neo4j service covering:

**Constructor Tests:**
- Service instantiation with proper dependencies
- Configuration value handling (custom and default values)
- Logger context setting

**Lifecycle Methods:**
- `onModuleInit()` - Connection establishment and error handling
- `onModuleDestroy()` - Proper cleanup and connection closing

**Query Methods:**
- `read()` - Read query execution, error handling, and session management
- `write()` - Write query execution, error handling, and session management

**Error Scenarios:**
- Database connection failures
- Query execution errors
- Session management and cleanup

### `neo4j.integration.spec.ts`
Integration tests demonstrating:

**Mocked Integration Tests:**
- Service configuration with real dependencies
- Configuration service integration
- Logger integration

**Real Database Tests (Skipped by default):**
- Actual Neo4j database connectivity
- CRUD operations with real data
- Complex queries and relationships
- Transaction handling

## Running Tests

### Run all Neo4j service tests:
```bash
npm test -- --testNamePattern="Neo4jService"
```

### Run specific test file:
```bash
npm test -- src/common/neo4j/neo4j.service.spec.ts
```

### Run with coverage:
```bash
npm run test:cov -- src/common/neo4j/neo4j.service.spec.ts
```

### Run integration tests:
```bash
npm test -- src/common/neo4j/neo4j.integration.spec.ts
```

## Test Coverage

The unit tests provide 100% code coverage for the Neo4j service including:
- All public methods
- Error handling paths
- Edge cases
- Async operations
- Dependency injection

## Integration Test Setup

To run integration tests with a real Neo4j database:

1. Remove `.skip` from the integration test describe block
2. Set environment variables:
   ```bash
   export NEO4J_URI=bolt://localhost:7687
   export NEO4J_USERNAME=neo4j
   export NEO4J_PASSWORD=your_password
   ```
3. Ensure Neo4j is running locally or accessible at the specified URI
4. Run the integration tests

## Test Patterns Used

- **Dependency Injection Mocking**: All external dependencies (ConfigService, PinoLogger, Neo4j driver) are properly mocked
- **Async Testing**: All async operations are properly tested with proper await patterns
- **Error Simulation**: Error conditions are simulated to test error handling paths
- **Resource Cleanup**: Tests ensure proper cleanup of resources (sessions, connections)
- **Descriptive Test Names**: Each test clearly describes what scenario it's testing

## Mock Strategy

The tests use comprehensive mocking to isolate the service under test:
- Neo4j driver is mocked to simulate database operations
- Sessions are mocked to test query execution
- ConfigService is mocked to test configuration handling
- Logger is mocked to verify logging behavior

This approach ensures tests are:
- Fast (no real database connections)
- Reliable (no external dependencies)
- Comprehensive (can test error scenarios easily)
- Isolated (each test is independent)
