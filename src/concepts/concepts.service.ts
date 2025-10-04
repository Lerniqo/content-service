import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { ConceptResponseDto } from './dto/concept-response.dto';
import { ConceptPrerequisiteDto } from './dto/concept-prerequisite.dto';
import { LearningResourceDto } from './dto/learning-resource.dto';
import { LoggerUtil } from '../common/utils/logger.util';

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
      const result = (await this.neo4jService.read(cypher, { conceptId })) as ConceptQueryResult[];

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
}
