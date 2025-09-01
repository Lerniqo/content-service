# Database Setup Scripts

This directory contains scripts for initializing and seeding the Neo4j database with syllabus graph data.

## Structure

```
setup/
├── index.ts              # Main CLI entry point
├── setup.ts              # Core setup orchestrator
├── config/
│   ├── setup.config.ts   # Configuration types and factory
│   └── database.connection.ts  # Database connection utility
├── scripts/
│   ├── cleanup-database.ts     # Remove all existing data
│   ├── seed-concepts.ts        # Create concept nodes
│   ├── seed-prerequisites.ts   # Create prerequisite relationships
│   ├── seed-resources.ts       # Create resource nodes
│   ├── import-concepts-graph.ts # Import all concepts from hierarchy file
│   ├── validate-imported-graph.ts # Validate imported concepts graph
│   ├── query-imported-concepts.ts # Query and display imported concepts
│   └── validate-data.ts        # Validate seeded data integrity
└── types/
    └── setup.types.ts    # TypeScript type definitions
```

## Usage

### CLI Commands

```bash
# Run all setup scripts
npm run setup run

# Run specific scripts
npm run setup run seed-concepts seed-resources

# List available scripts
npm run setup list

# Check database health
npm run setup health

# Show current configuration
npm run setup config
```

### Programmatic Usage

```typescript
import { DatabaseSetup } from './setup';

const setup = new DatabaseSetup();

// Run all scripts
const results = await setup.execute();

// Run specific scripts
const results = await setup.execute({
  scripts: ['seed-concepts', 'seed-resources']
});

// Run with options
const results = await setup.execute({
  continueOnError: true,
  verbose: true
});
```

## Configuration

The setup scripts can be configured using environment variables:

- `NEO4J_URI` - Neo4j connection URI (default: `bolt://localhost:7687`)
- `NEO4J_USERNAME` - Neo4j username (default: `neo4j`)
- `NEO4J_PASSWORD` - Neo4j password (default: `password`)
- `NEO4J_DATABASE` - Neo4j database name
- `DROP_EXISTING_DATA` - Whether to drop existing data before seeding (default: `false`)
- `SEED_DATA` - Whether to seed data (default: `true`)
- `CONTINUE_ON_ERROR` - Whether to continue on script errors (default: `false`)
- `VERBOSE` - Enable verbose logging (default: `false`)

## Available Scripts

### cleanup-database
Removes all existing nodes and relationships from the database.

### seed-concepts
Creates initial concept nodes for the syllabus graph:
- Classical Mechanics, Thermodynamics, Electromagnetism (Physics)
- Organic Chemistry, Inorganic Chemistry, Physical Chemistry (Chemistry)
- Cell Biology, Genetics, Ecology (Biology)

### seed-prerequisites
Creates prerequisite relationships between concepts:
- Classical Mechanics → Thermodynamics → Electromagnetism
- Organic Chemistry → Physical Chemistry
- Cell Biology → Genetics → Ecology

### seed-resources
Creates sample resource nodes with different types:
- Video resources
- Document resources
- Links resources to concepts

### import-concepts-graph
Imports all concepts from the `4 Layered Mapping.txt` file and establishes CONTAINS relationships between parent and child concepts according to the hierarchical structure.

This script creates all concepts including:
- Subject (Ordinary Level Mathematics)
- Matters (Numbers, Measurements, Algebra, Geometry, Sets and Probability, Statistics)
- Molecules (Fractions, Percentages, Decimals, etc.)
- Atoms (Multiplication of Fractions, Division of Fractions, etc.)
- Particles (fraction-multiplication, of-means-multiply, etc.)

### validate-imported-graph
Validates the imported concepts graph by checking:
- Total number of concepts (should be 191)
- Total number of CONTAINS relationships (should be 190)
- Root concept existence
- Concept types distribution
- Maximum hierarchy depth

### query-imported-concepts
Queries and displays information about imported concepts including:
- Root concept details
- First level concepts (Matters)
- Specific molecule and its children
- Specific atom and its particles
- Example concept hierarchy path

### validate-data
Validates the integrity of seeded data by checking:
- Expected number of concepts (9)
- Expected number of prerequisites (5)
- Expected number of resources (3)
- No orphaned resources

## Dependencies

Scripts have dependencies that are automatically resolved:

- `seed-prerequisites` depends on `seed-concepts`
- `validate-data` depends on all seeding scripts

## Adding New Scripts

1. Create a new script file in `scripts/` directory
2. Implement the `SetupScript` interface
3. Register the script in `DatabaseSetup.registerScripts()`
4. Add any dependencies using the `dependsOn` property

Example:

```typescript
export const myScript: SetupScript = {
  name: 'my-script',
  description: 'Description of what this script does',
  dependsOn: ['other-script'],
  execute: async (db: DatabaseConnection) => {
    // Your seeding logic here
  },
};
```
