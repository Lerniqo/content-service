import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { ConceptResponseDto } from './dto/concept-response.dto';
import { ConceptPrerequisiteDto } from './dto/concept-prerequisite.dto';
import { LearningResourceDto } from './dto/learning-resource.dto';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

interface PrerequisiteData {
  conceptId: string | null;
  name: string | null;
  type: string | null;
  description: string | null;
}

interface ResourceData {
  resourceId: string | null;
  name: string | null;
  type: string | null;
  description: string | null;
  url: string | null;
  isPublic: boolean | null;
  price: number | null;
  tags: string[] | null;
  gradeLevel: string | null;
  subject: string | null;
}

interface ConceptQueryResult {
  conceptId: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: string | null;
  prerequisites: PrerequisiteData[];
  resources: ResourceData[];
}

@Injectable()
export class ConceptsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConceptsService.name);
  }

  async getConceptById(conceptId: string): Promise<ConceptResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsService',
      'Fetching concept by ID with prerequisites and associated resources',
      { conceptId },
    );

    const cypher = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      
      // Get prerequisites
      OPTIONAL MATCH (c)-[:HAS_PREREQUISITE]->(prereq:SyllabusConcept)
      
      // Get associated resources - resources are linked to topics that have this concept as prerequisite
      OPTIONAL MATCH (topic:SyllabusConcept {type: 'Topic'})-[:HAS_PREREQUISITE]->(c)
      OPTIONAL MATCH (topic)<-[:EXPLAINS]-(resource:Resource)
      
      // Also get direct resources if any exist
      OPTIONAL MATCH (c)<-[:EXPLAINS]-(directResource)
      WHERE directResource:Resource OR directResource:Quiz
      
      RETURN 
        c.conceptId as conceptId,
        c.name as name,
        c.type as type,
        c.description as description,
        c.createdAt as createdAt,
        
        // Collect prerequisites
        COLLECT(DISTINCT {
          conceptId: prereq.conceptId,
          name: prereq.name,
          type: prereq.type,
          description: prereq.description
        }) as prerequisites,
        
        // Collect resources from both sources
        COLLECT(DISTINCT {
          resourceId: CASE 
            WHEN resource:Resource THEN resource.resourceId 
            WHEN directResource:Resource THEN directResource.resourceId
            WHEN directResource:Quiz THEN directResource.quizId
            ELSE null
          END,
          name: COALESCE(resource.title, directResource.name),
          type: COALESCE(resource.type, 
                CASE WHEN directResource:Quiz THEN 'quiz' ELSE directResource.type END),
          description: COALESCE(resource.description, directResource.description),
          url: COALESCE(resource.url, directResource.url),
          isPublic: COALESCE(resource.isPublic, directResource.isPublic),
          price: COALESCE(resource.price, directResource.price),
          tags: COALESCE(resource.tags, directResource.tags),
          gradeLevel: COALESCE(resource.grade, directResource.gradeLevel),
          subject: COALESCE(resource.subject, directResource.subject)
        }) as resources
    `;

    try {
      const result = (await this.neo4jService.read(cypher, {
        conceptId,
      })) as ConceptQueryResult[];

      if (!result || result.length === 0) {
        LoggerUtil.logWarn(
          this.logger,
          'ConceptsService',
          'Concept not found',
          { conceptId },
        );
        throw new NotFoundException(`Concept with ID ${conceptId} not found`);
      }

      const conceptData = result[0];

      // Filter out null prerequisites (when no prerequisites exist)
      const prerequisites = conceptData.prerequisites
        .filter((prereq: PrerequisiteData) => prereq.conceptId !== null)
        .map(
          (prereq: PrerequisiteData) =>
            new ConceptPrerequisiteDto(
              prereq.conceptId!,
              prereq.name!,
              prereq.type!,
              prereq.description ?? undefined,
            ),
        );

      // Filter out null resources (when no resources exist)
      const learningResources = conceptData.resources
        .filter((resource: ResourceData) => resource.resourceId !== null)
        .map(
          (resource: ResourceData) =>
            new LearningResourceDto(
              resource.resourceId!,
              resource.name!,
              resource.type!,
              resource.description ?? undefined,
              resource.url ?? undefined,
              resource.isPublic ?? undefined,
              resource.price ?? undefined,
              resource.tags ?? undefined,
              resource.gradeLevel ?? undefined,
              resource.subject ?? undefined,
            ),
        );

      const response = new ConceptResponseDto(
        conceptData.conceptId,
        conceptData.name,
        conceptData.type,
        prerequisites,
        learningResources,
        conceptData.description ?? undefined,
        conceptData.createdAt ?? undefined,
      );

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsService',
        'Concept retrieved successfully',
        {
          conceptId,
          prerequisitesCount: prerequisites.length,
          resourcesCount: learningResources.length,
        },
      );

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Failed to retrieve concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }

  async getAllConcepts(): Promise<ConceptResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsService',
      'Fetching all concepts',
      {},
    );

    const cypher = `
      MATCH (c:SyllabusConcept)
      
      // Get prerequisites
      OPTIONAL MATCH (c)-[:HAS_PREREQUISITE]->(prereq:SyllabusConcept)
      
      // Get associated resources
      OPTIONAL MATCH (topic:SyllabusConcept {type: 'Topic'})-[:HAS_PREREQUISITE]->(c)
      OPTIONAL MATCH (topic)<-[:EXPLAINS]-(resource:Resource)
      
      // Also get direct resources if any exist
      OPTIONAL MATCH (c)<-[:EXPLAINS]-(directResource)
      WHERE directResource:Resource OR directResource:Quiz
      
      RETURN 
        c.conceptId as conceptId,
        c.name as name,
        c.type as type,
        c.description as description,
        c.createdAt as createdAt,
        
        COLLECT(DISTINCT {
          conceptId: prereq.conceptId,
          name: prereq.name,
          type: prereq.type,
          description: prereq.description
        }) as prerequisites,
        
        COLLECT(DISTINCT {
          resourceId: CASE 
            WHEN resource:Resource THEN resource.resourceId 
            WHEN directResource:Resource THEN directResource.resourceId
            WHEN directResource:Quiz THEN directResource.quizId
            ELSE null
          END,
          name: COALESCE(resource.title, directResource.name),
          type: COALESCE(resource.type, 
                CASE WHEN directResource:Quiz THEN 'quiz' ELSE directResource.type END),
          description: COALESCE(resource.description, directResource.description),
          url: COALESCE(resource.url, directResource.url),
          isPublic: COALESCE(resource.isPublic, directResource.isPublic),
          price: COALESCE(resource.price, directResource.price),
          tags: COALESCE(resource.tags, directResource.tags),
          gradeLevel: COALESCE(resource.grade, directResource.gradeLevel),
          subject: COALESCE(resource.subject, directResource.subject)
        }) as resources
      ORDER BY c.createdAt DESC
    `;

    try {
      const result = (await this.neo4jService.read(
        cypher,
        {},
      )) as ConceptQueryResult[];

      const concepts = result.map((conceptData) => {
        const prerequisites = conceptData.prerequisites
          .filter((prereq: PrerequisiteData) => prereq.conceptId !== null)
          .map(
            (prereq: PrerequisiteData) =>
              new ConceptPrerequisiteDto(
                prereq.conceptId!,
                prereq.name!,
                prereq.type!,
                prereq.description ?? undefined,
              ),
          );

        const learningResources = conceptData.resources
          .filter((resource: ResourceData) => resource.resourceId !== null)
          .map(
            (resource: ResourceData) =>
              new LearningResourceDto(
                resource.resourceId!,
                resource.name!,
                resource.type!,
                resource.description ?? undefined,
                resource.url ?? undefined,
                resource.isPublic ?? undefined,
                resource.price ?? undefined,
                resource.tags ?? undefined,
                resource.gradeLevel ?? undefined,
                resource.subject ?? undefined,
              ),
          );

        return new ConceptResponseDto(
          conceptData.conceptId,
          conceptData.name,
          conceptData.type,
          prerequisites,
          learningResources,
          conceptData.description ?? undefined,
          conceptData.createdAt ?? undefined,
        );
      });

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsService',
        'All concepts retrieved successfully',
        { count: concepts.length },
      );

      return concepts;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Failed to retrieve concepts',
        error,
        {},
      );
      throw error;
    }
  }

  async createConcept(
    createConceptDto: CreateConceptDto,
  ): Promise<ConceptResponseDto> {
    const conceptId = uuidv4();
    LoggerUtil.logInfo(this.logger, 'ConceptsService', 'Creating new concept', {
      conceptId,
      name: createConceptDto.name,
    });

    // Verify prerequisites exist if provided
    if (
      createConceptDto.prerequisiteIds &&
      createConceptDto.prerequisiteIds.length > 0
    ) {
      const verifyQuery = `
        MATCH (c:SyllabusConcept)
        WHERE c.conceptId IN $prerequisiteIds
        RETURN count(c) as count
      `;
      const verifyResult = (await this.neo4jService.read(verifyQuery, {
        prerequisiteIds: createConceptDto.prerequisiteIds,
      })) as Array<{ count: number }>;

      if (verifyResult[0].count !== createConceptDto.prerequisiteIds.length) {
        throw new BadRequestException(
          'One or more prerequisite concepts not found',
        );
      }
    }

    const cypher = `
      CREATE (c:SyllabusConcept {
        conceptId: $conceptId,
        name: $name,
        type: $type,
        description: $description,
        createdAt: datetime()
      })
      
      WITH c
      ${
        createConceptDto.prerequisiteIds &&
        createConceptDto.prerequisiteIds.length > 0
          ? `
      UNWIND $prerequisiteIds AS prereqId
      MATCH (prereq:SyllabusConcept {conceptId: prereqId})
      CREATE (c)-[:HAS_PREREQUISITE]->(prereq)
      WITH DISTINCT c
      `
          : ''
      }
      
      RETURN 
        c.conceptId as conceptId,
        c.name as name,
        c.type as type,
        c.description as description,
        toString(c.createdAt) as createdAt
    `;

    try {
      await this.neo4jService.write(cypher, {
        conceptId,
        name: createConceptDto.name,
        type: createConceptDto.type,
        description: createConceptDto.description ?? null,
        prerequisiteIds: createConceptDto.prerequisiteIds ?? [],
      });

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsService',
        'Concept created successfully',
        { conceptId },
      );

      // Fetch the complete concept with prerequisites
      return this.getConceptById(conceptId);
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Failed to create concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }

  async updateConcept(
    conceptId: string,
    updateConceptDto: UpdateConceptDto,
  ): Promise<ConceptResponseDto> {
    LoggerUtil.logInfo(this.logger, 'ConceptsService', 'Updating concept', {
      conceptId,
      updates: Object.keys(updateConceptDto),
    });

    // Verify concept exists
    const existsQuery = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      RETURN c.conceptId as conceptId
    `;
    const existsResult = (await this.neo4jService.read(existsQuery, {
      conceptId,
    })) as Array<{ conceptId: string }>;

    if (!existsResult || existsResult.length === 0) {
      throw new NotFoundException(`Concept with ID ${conceptId} not found`);
    }

    // Verify prerequisites exist if provided
    if (
      updateConceptDto.prerequisiteIds &&
      updateConceptDto.prerequisiteIds.length > 0
    ) {
      const verifyQuery = `
        MATCH (c:SyllabusConcept)
        WHERE c.conceptId IN $prerequisiteIds
        RETURN count(c) as count
      `;
      const verifyResult = (await this.neo4jService.read(verifyQuery, {
        prerequisiteIds: updateConceptDto.prerequisiteIds,
      })) as Array<{ count: number }>;

      if (verifyResult[0].count !== updateConceptDto.prerequisiteIds.length) {
        throw new BadRequestException(
          'One or more prerequisite concepts not found',
        );
      }

      // Check for circular dependencies
      const circularCheckQuery = `
        MATCH (c:SyllabusConcept {conceptId: $conceptId})
        MATCH path = (c)-[:HAS_PREREQUISITE*]->(prereq:SyllabusConcept)
        WHERE prereq.conceptId IN $prerequisiteIds
        RETURN count(path) as circularCount
      `;
      const circularResult = (await this.neo4jService.read(circularCheckQuery, {
        conceptId,
        prerequisiteIds: updateConceptDto.prerequisiteIds,
      })) as Array<{ circularCount: number }>;

      if (circularResult[0] && circularResult[0].circularCount > 0) {
        throw new BadRequestException(
          'Circular dependency detected in prerequisites',
        );
      }
    }

    const updateFields: string[] = [];
    const params: Record<string, unknown> = { conceptId };

    if (updateConceptDto.name !== undefined) {
      updateFields.push('c.name = $name');
      params.name = updateConceptDto.name;
    }
    if (updateConceptDto.type !== undefined) {
      updateFields.push('c.type = $type');
      params.type = updateConceptDto.type;
    }
    if (updateConceptDto.description !== undefined) {
      updateFields.push('c.description = $description');
      params.description = updateConceptDto.description;
    }

    let cypher = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
    `;

    if (updateFields.length > 0) {
      cypher += `
      SET ${updateFields.join(', ')}
      `;
    }

    if (updateConceptDto.prerequisiteIds !== undefined) {
      cypher += `
      WITH c
      OPTIONAL MATCH (c)-[r:HAS_PREREQUISITE]->()
      DELETE r
      WITH c
      ${
        updateConceptDto.prerequisiteIds.length > 0
          ? `
      UNWIND $prerequisiteIds AS prereqId
      MATCH (prereq:SyllabusConcept {conceptId: prereqId})
      CREATE (c)-[:HAS_PREREQUISITE]->(prereq)
      WITH DISTINCT c
      `
          : ''
      }
      `;
      params.prerequisiteIds = updateConceptDto.prerequisiteIds;
    }

    cypher += `
      RETURN c.conceptId as conceptId
    `;

    try {
      await this.neo4jService.write(cypher, params);

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsService',
        'Concept updated successfully',
        { conceptId },
      );

      return this.getConceptById(conceptId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Failed to update concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }

  async deleteConcept(conceptId: string): Promise<{ message: string }> {
    LoggerUtil.logInfo(this.logger, 'ConceptsService', 'Deleting concept', {
      conceptId,
    });

    // Check if concept exists
    const existsQuery = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      RETURN c.conceptId as conceptId
    `;
    const existsResult = (await this.neo4jService.read(existsQuery, {
      conceptId,
    })) as Array<{ conceptId: string }>;

    if (!existsResult || existsResult.length === 0) {
      throw new NotFoundException(`Concept with ID ${conceptId} not found`);
    }

    // Check if concept is a prerequisite for other concepts
    const dependenciesQuery = `
      MATCH (other:SyllabusConcept)-[:HAS_PREREQUISITE]->(c:SyllabusConcept {conceptId: $conceptId})
      RETURN count(other) as dependencyCount
    `;
    const dependenciesResult = (await this.neo4jService.read(
      dependenciesQuery,
      {
        conceptId,
      },
    )) as Array<{ dependencyCount: number }>;

    if (dependenciesResult[0] && dependenciesResult[0].dependencyCount > 0) {
      throw new ConflictException(
        `Cannot delete concept. It is a prerequisite for ${dependenciesResult[0].dependencyCount} other concept(s)`,
      );
    }

    const cypher = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      OPTIONAL MATCH (c)-[r]-()
      DELETE r, c
      RETURN count(c) as deletedCount
    `;

    try {
      await this.neo4jService.write(cypher, { conceptId });

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsService',
        'Concept deleted successfully',
        { conceptId },
      );

      return { message: `Concept with ID ${conceptId} deleted successfully` };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Failed to delete concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }
}
