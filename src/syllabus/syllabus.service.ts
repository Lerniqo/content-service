/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { SyllabusResponseDto } from './dto/syllabus-response.dto';
import { SyllabusConceptDto } from './dto/syllabus-concept.dto';
import { LoggerUtil } from '../common/utils/logger.util';

interface RawConcept {
  conceptId: string;
  name: string;
  type: string;
  description?: string;
  createdAt?: string;
}

interface RawRelationship {
  parentId: string;
  childId: string;
}

@Injectable()
export class SyllabusService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SyllabusService.name);
  }

  async getSyllabus(): Promise<SyllabusResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusService',
      'Fetching complete syllabus tree',
      {},
    );

    try {
      // Fetch all concepts and relationships separately for easier tree building
      const [concepts, relationships] = await Promise.all([
        this.fetchAllConcepts(),
        this.fetchAllRelationships(),
      ]);

      LoggerUtil.logDebug(
        this.logger,
        'SyllabusService',
        'Retrieved raw data from Neo4j',
        { 
          conceptCount: concepts.length,
          relationshipCount: relationships.length,
        },
      );

      // Build hierarchical tree structure
      const syllabusTree = this.buildTree(concepts, relationships);

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusService',
        'Successfully built syllabus tree',
        { 
          rootNodes: syllabusTree.length,
          totalConcepts: concepts.length,
        },
      );

      return new SyllabusResponseDto(syllabusTree, concepts.length);
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Failed to fetch syllabus',
        error,
        {},
      );
      throw new InternalServerErrorException('Failed to retrieve syllabus');
    }
  }

  private async fetchAllConcepts(): Promise<RawConcept[]> {
    const query = `
      MATCH (c:SyllabusConcept)
      RETURN 
        c.conceptId as conceptId,
        c.name as name,
        c.type as type,
        c.description as description,
        c.createdAt as createdAt
      ORDER BY c.type, c.name
    `;

    try {
      const result = (await this.neo4jService.read(query, {})) as Record<string, any>[];
      
      return result.map((record) => ({
        conceptId: record.conceptId as string,
        name: record.name as string,
        type: record.type as string,
        description: record.description as string || undefined,
        createdAt: record.createdAt ? 
          (typeof record.createdAt === 'string' ? record.createdAt : String(record.createdAt)) : 
          undefined,
      }));
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Error fetching concepts from Neo4j',
        error,
        {},
      );
      throw new InternalServerErrorException('Failed to fetch concepts');
    }
  }

  private async fetchAllRelationships(): Promise<RawRelationship[]> {
    const query = `
      MATCH (parent:SyllabusConcept)-[:CONTAINS]->(child:SyllabusConcept)
      RETURN 
        parent.conceptId as parentId,
        child.conceptId as childId
    `;

    try {
      const result = (await this.neo4jService.read(query, {})) as Record<string, any>[];
      
      return result.map((record) => ({
        parentId: record.parentId as string,
        childId: record.childId as string,
      }));
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Error fetching relationships from Neo4j',
        error,
        {},
      );
      throw new InternalServerErrorException('Failed to fetch relationships');
    }
  }

  private buildTree(concepts: RawConcept[], relationships: RawRelationship[]): SyllabusConceptDto[] {
    // Create a map for quick concept lookup
    const conceptMap = new Map<string, RawConcept>();
    concepts.forEach(concept => {
      conceptMap.set(concept.conceptId, concept);
    });

    // Create a map to track children for each parent
    const childrenMap = new Map<string, string[]>();
    relationships.forEach(rel => {
      if (!childrenMap.has(rel.parentId)) {
        childrenMap.set(rel.parentId, []);
      }
      childrenMap.get(rel.parentId)!.push(rel.childId);
    });

    // Find root nodes (concepts that are not children of any other concept)
    const allChildIds = new Set(relationships.map(rel => rel.childId));
    const rootNodes = concepts.filter(concept => !allChildIds.has(concept.conceptId));

    LoggerUtil.logDebug(
      this.logger,
      'SyllabusService',
      'Building tree structure',
      { 
        rootNodeCount: rootNodes.length,
        rootNodeTypes: rootNodes.map(n => n.type),
      },
    );

    // Recursively build tree starting from root nodes
    return rootNodes.map(rootConcept => this.buildConceptTree(rootConcept, conceptMap, childrenMap));
  }

  private buildConceptTree(
    concept: RawConcept,
    conceptMap: Map<string, RawConcept>,
    childrenMap: Map<string, string[]>,
  ): SyllabusConceptDto {
    const childIds = childrenMap.get(concept.conceptId) || [];
    const children: SyllabusConceptDto[] = [];

    // Recursively build children
    for (const childId of childIds) {
      const childConcept = conceptMap.get(childId);
      if (childConcept) {
        children.push(this.buildConceptTree(childConcept, conceptMap, childrenMap));
      }
    }

    // Sort children by type hierarchy and then by name
    children.sort((a, b) => {
      const typeOrder = ['Matter', 'Grade', 'Molecule', 'Topic', 'Atom', 'Particle'];
      const aTypeIndex = typeOrder.indexOf(a.type);
      const bTypeIndex = typeOrder.indexOf(b.type);
      
      if (aTypeIndex !== bTypeIndex) {
        return aTypeIndex - bTypeIndex;
      }
      
      return a.name.localeCompare(b.name);
    });

    return new SyllabusConceptDto(
      concept.conceptId,
      concept.name,
      concept.type,
      concept.description,
      children.length > 0 ? children : undefined,
      concept.createdAt,
    );
  }
}