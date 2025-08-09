# Neo4j Graph Node Types

This module contains TypeScript interfaces and validation classes for Neo4j graph database nodes used in the content service.

## Overview

The module provides:
- **Base interfaces** representing Neo4j node structures
- **Validation classes** with decorators for NestJS controllers  
- **Type constants** for consistent string values across the application

## Node Types

### Core Node Types

#### User Hierarchy
```typescript
interface User { id: string }
interface Student extends User {}
interface Teacher extends User {}  
interface Admin extends User {}
```

#### Content Nodes
- `Concept` - Learning concepts with categorization
- `Resource` - Educational resources (videos, documents, etc.)
- `SyllabusContent` - Course syllabus information
- `Question` - Quiz/test questions with multiple choice options
- `Quiz` - Timed quizzes containing questions
- `Contest` - Programming contests with participants and status

### Type Constants

Instead of enums, we use const assertions for better Neo4j compatibility:

```typescript
export const CONCEPT_TYPES = ['topic', 'subtopic', 'skill', 'knowledge_point'] as const;
export const RESOURCE_TYPES = ['video', 'document', 'article', 'presentation', 'interactive', 'assignment'] as const;
export const CONTEST_TYPES = ['programming', 'quiz', 'project', 'hackathon'] as const;
export const CONTEST_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'] as const;

export type ConceptType = typeof CONCEPT_TYPES[number];
export type ResourceType = typeof RESOURCE_TYPES[number];
// ... etc
```

## Validation Classes

Each node type has corresponding validation classes:

- `{Type}Node` - Full node validation (includes ID)
- `Create{Type}Node` - Creation validation (no ID)
- `Update{Type}Node` - Update validation (all optional except ID)

### Usage in Controllers

```typescript
import { CreateResourceNode, UpdateResourceNode, ResourceNode } from '@/libs/shared-types';

@Controller('resources')
export class ResourceController {
  @Post()
  @ApiOperation({ summary: 'Create a new resource' })
  @ApiResponse({ status: 201, description: 'Resource created successfully', type: ResourceNode })
  async createResource(@Body() createResourceDto: CreateResourceNode): Promise<ResourceNode> {
    return await this.resourceService.create(createResourceDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resource' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully', type: ResourceNode })
  async updateResource(
    @Param('id') id: string,
    @Body() updateResourceDto: UpdateResourceNode
  ): Promise<ResourceNode> {
    return await this.resourceService.update(id, updateResourceDto);
  }
}
```

### Usage in Services

```typescript
import { Resource, CreateResourceNode } from '@/libs/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResourceService {
  async create(createResourceData: CreateResourceNode): Promise<Resource> {
    const resource: Resource = {
      id: uuidv4(),
      ...createResourceData,
      createdAt: new Date(),
      author: await this.getAuthor(createResourceData.authorId)
    };
    
    // Create node in Neo4j
    const result = await this.neo4jService.write(`
      CREATE (r:Resource {
        id: $id,
        name: $name,
        type: $type,
        description: $description,
        url: $url,
        isPublic: $isPublic,
        tags: $tags,
        createdAt: datetime($createdAt)
      })
      RETURN r
    `, resource);
    
    return result.records[0].get('r').properties;
  }
}
```

## Neo4j Integration

### Node Labels
The validation classes are designed to work directly with Neo4j node labels:

```cypher
-- Concept nodes
CREATE (c:Concept {id: $id, name: $name, type: $type})

-- Resource nodes  
CREATE (r:Resource {
  id: $id, 
  name: $name, 
  type: $type,
  url: $url,
  isPublic: $isPublic,
  createdAt: datetime()
})

-- User nodes with labels
CREATE (u:User:Teacher {id: $id})
CREATE (u:User:Student {id: $id})
CREATE (u:User:Admin {id: $id})
```

### Relationships
You can define relationships between nodes:

```cypher
-- Teacher authors Resource
MATCH (t:Teacher {id: $teacherId}), (r:Resource {id: $resourceId})
CREATE (t)-[:AUTHORED]->(r)

-- Resource belongs to Concept  
MATCH (r:Resource {id: $resourceId}), (c:Concept {id: $conceptId})
CREATE (r)-[:BELONGS_TO]->(c)

-- Quiz contains Questions
MATCH (q:Quiz {id: $quizId}), (question:Question {id: $questionId})  
CREATE (q)-[:CONTAINS]->(question)
```

## Best Practices

### 1. Type Safety
Use the provided type constants for consistent values:
```typescript
// ✅ Good
const resourceType: ResourceType = 'video';
if (RESOURCE_TYPES.includes(resourceType)) { ... }

// ❌ Avoid
const resourceType = 'video'; // no type checking
```

### 2. Validation in Controllers
Always use validation classes in your controller endpoints:
```typescript
@Post()
async create(@Body() data: CreateConceptNode) {
  // data is automatically validated
}
```

### 3. Interface Usage in Services
Use base interfaces for internal logic:
```typescript
class ConceptService {
  private concepts: Concept[] = [];
  
  findByType(type: string): Concept[] {
    return this.concepts.filter(c => c.type === type);
  }
}
```

### 4. Neo4j Queries
When writing Cypher queries, use the same property names as defined in interfaces:
```typescript
// ✅ Matches interface properties
const query = `
  CREATE (c:Concept {
    id: $id,
    name: $name, 
    type: $type
  })
`;
```

## Error Handling

The validation classes will automatically validate:
- Required fields presence
- Data types (string, number, boolean)
- URL formats  
- UUID formats
- Array constraints (min size, element types)
- Numeric ranges (min/max values)
- Enum values using `@IsIn()` decorator

```typescript
// This will automatically fail validation:
const invalidResource = {
  name: "", // empty string - fails @IsString()
  type: "invalid_type", // not in RESOURCE_TYPES - fails @IsIn() 
  url: "not-a-url", // invalid URL - fails @IsUrl()
  timeLimit: -5 // negative number - fails @Min()
};
```

## GraphQL Integration

If using GraphQL, you can create object types from these interfaces:

```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Resource } from '@/libs/shared-types';

@ObjectType()
export class ResourceType implements Resource {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
  
  @Field()
  type: string;
  
  @Field(() => [String], { nullable: true })
  tags?: string[];
  
  // ... other fields
}
```

This approach provides complete type safety from the database layer through the API layer while maintaining clean separation of concerns.
