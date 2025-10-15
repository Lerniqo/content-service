/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { SyllabusResponseDto } from './dto/syllabus-response.dto';
import { SyllabusConceptDto } from './dto/syllabus-concept.dto';
import { CreateSyllabusConceptDto } from './dto/create-syllabus-concept.dto';
import { UpdateSyllabusConceptDto } from './dto/update-syllabus-concept.dto';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

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
      children,
      concept.createdAt,
    );
  }
  
  async getConceptById(conceptId: string): Promise<SyllabusConceptDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusService',
      'Fetching syllabus concept by ID',
      { conceptId },
    );

    try {
      const query = `
        MATCH (c:SyllabusConcept {conceptId: $conceptId})
        RETURN 
          c.conceptId as conceptId,
          c.name as name,
          c.type as type,
          c.description as description,
          c.createdAt as createdAt
      `;

      const result = (await this.neo4jService.read(query, { conceptId })) as Record<string, any>[];

      if (!result || result.length === 0) {
        throw new NotFoundException(`Syllabus concept with ID ${conceptId} not found`);
      }

      const concept = result[0];

      // Fetch children
      const childrenQuery = `
        MATCH (parent:SyllabusConcept {conceptId: $conceptId})-[:CONTAINS]->(child:SyllabusConcept)
        RETURN 
          child.conceptId as conceptId,
          child.name as name,
          child.type as type,
          child.description as description,
          child.createdAt as createdAt
        ORDER BY child.type, child.name
      `;

      const childrenResult = (await this.neo4jService.read(childrenQuery, { conceptId })) as Record<string, any>[];

      const children = childrenResult.map(child => new SyllabusConceptDto(
        child.conceptId as string,
        child.name as string,
        child.type as string,
        child.description as string || undefined,
        undefined,
        child.createdAt ? String(child.createdAt) : undefined,
      ));

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusService',
        'Successfully fetched syllabus concept',
        { conceptId, childrenCount: children.length },
      );

      return new SyllabusConceptDto(
        concept.conceptId as string,
        concept.name as string,
        concept.type as string,
        concept.description as string || undefined,
        children.length > 0 ? children : undefined,
        concept.createdAt ? String(concept.createdAt) : undefined,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Failed to fetch syllabus concept by ID',
        error,
        { conceptId },
      );
      throw new InternalServerErrorException('Failed to retrieve syllabus concept');
    }
  }

  async createConcept(createDto: CreateSyllabusConceptDto): Promise<SyllabusConceptDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusService',
      'Creating new syllabus concept',
      { name: createDto.name, type: createDto.type },
    );

    try {
      const conceptId = uuidv4();
      const createdAt = new Date().toISOString();

      // If parentId is provided, verify it exists
      if (createDto.parentId) {
        const parentCheckQuery = `
          MATCH (parent:SyllabusConcept {conceptId: $parentId})
          RETURN parent.conceptId as conceptId
        `;
        const parentResult = (await this.neo4jService.read(parentCheckQuery, { parentId: createDto.parentId })) as Record<string, any>[];
        
        if (!parentResult || parentResult.length === 0) {
          throw new NotFoundException(`Parent concept with ID ${createDto.parentId} not found`);
        }
      }

      // Create the concept node
      const createQuery = `
        CREATE (c:SyllabusConcept {
          conceptId: $conceptId,
          name: $name,
          type: $type,
          description: $description,
          createdAt: $createdAt
        })
        RETURN 
          c.conceptId as conceptId,
          c.name as name,
          c.type as type,
          c.description as description,
          c.createdAt as createdAt
      `;

      const params = {
        conceptId,
        name: createDto.name,
        type: createDto.type,
        description: createDto.description || null,
        createdAt,
      };

      const result = (await this.neo4jService.write(createQuery, params)) as Record<string, any>[];

      // If parentId is provided, create the CONTAINS relationship
      if (createDto.parentId) {
        const relationshipQuery = `
          MATCH (parent:SyllabusConcept {conceptId: $parentId})
          MATCH (child:SyllabusConcept {conceptId: $conceptId})
          CREATE (parent)-[:CONTAINS]->(child)
        `;
        await this.neo4jService.write(relationshipQuery, {
          parentId: createDto.parentId,
          conceptId,
        });
      }

      const createdConcept = result[0];

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusService',
        'Successfully created syllabus concept',
        { conceptId, name: createDto.name },
      );

      return new SyllabusConceptDto(
        createdConcept.conceptId as string,
        createdConcept.name as string,
        createdConcept.type as string,
        createdConcept.description as string || undefined,
        undefined,
        createdConcept.createdAt ? String(createdConcept.createdAt) : undefined,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Failed to create syllabus concept',
        error,
        { name: createDto.name },
      );
      throw new InternalServerErrorException('Failed to create syllabus concept');
    }
  }

  async updateConcept(conceptId: string, updateDto: UpdateSyllabusConceptDto): Promise<SyllabusConceptDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusService',
      'Updating syllabus concept',
      { conceptId, updates: Object.keys(updateDto) },
    );

    try {
      // Check if concept exists
      const checkQuery = `
        MATCH (c:SyllabusConcept {conceptId: $conceptId})
        RETURN c.conceptId as conceptId
      `;
      const checkResult = (await this.neo4jService.read(checkQuery, { conceptId })) as Record<string, any>[];
      
      if (!checkResult || checkResult.length === 0) {
        throw new NotFoundException(`Syllabus concept with ID ${conceptId} not found`);
      }

      // If parentId is being updated, verify new parent exists
      if (updateDto.parentId) {
        const parentCheckQuery = `
          MATCH (parent:SyllabusConcept {conceptId: $parentId})
          RETURN parent.conceptId as conceptId
        `;
        const parentResult = (await this.neo4jService.read(parentCheckQuery, { parentId: updateDto.parentId })) as Record<string, any>[];
        
        if (!parentResult || parentResult.length === 0) {
          throw new NotFoundException(`Parent concept with ID ${updateDto.parentId} not found`);
        }

        // Check for circular reference
        if (updateDto.parentId === conceptId) {
          throw new BadRequestException('A concept cannot be its own parent');
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const params: Record<string, any> = { conceptId };

      if (updateDto.name !== undefined) {
        updateFields.push('c.name = $name');
        params.name = updateDto.name;
      }
      if (updateDto.type !== undefined) {
        updateFields.push('c.type = $type');
        params.type = updateDto.type;
      }
      if (updateDto.description !== undefined) {
        updateFields.push('c.description = $description');
        params.description = updateDto.description;
      }

      if (updateFields.length > 0) {
        const updateQuery = `
          MATCH (c:SyllabusConcept {conceptId: $conceptId})
          SET ${updateFields.join(', ')}
          RETURN 
            c.conceptId as conceptId,
            c.name as name,
            c.type as type,
            c.description as description,
            c.createdAt as createdAt
        `;
        await this.neo4jService.write(updateQuery, params);
      }

      // Update parent relationship if parentId is provided
      if (updateDto.parentId !== undefined) {
        // Remove existing parent relationships
        const removeParentQuery = `
          MATCH (parent:SyllabusConcept)-[r:CONTAINS]->(child:SyllabusConcept {conceptId: $conceptId})
          DELETE r
        `;
        await this.neo4jService.write(removeParentQuery, { conceptId });

        // Create new parent relationship if parentId is not null
        if (updateDto.parentId) {
          const createParentQuery = `
            MATCH (parent:SyllabusConcept {conceptId: $parentId})
            MATCH (child:SyllabusConcept {conceptId: $conceptId})
            CREATE (parent)-[:CONTAINS]->(child)
          `;
          await this.neo4jService.write(createParentQuery, {
            parentId: updateDto.parentId,
            conceptId,
          });
        }
      }

      // Fetch and return the updated concept
      const updatedConcept = await this.getConceptById(conceptId);

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusService',
        'Successfully updated syllabus concept',
        { conceptId },
      );

      return updatedConcept;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Failed to update syllabus concept',
        error,
        { conceptId },
      );
      throw new InternalServerErrorException('Failed to update syllabus concept');
    }
  }

  async deleteConcept(conceptId: string): Promise<void> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusService',
      'Deleting syllabus concept',
      { conceptId },
    );

    try {
      // Check if concept exists
      const checkQuery = `
        MATCH (c:SyllabusConcept {conceptId: $conceptId})
        RETURN c.conceptId as conceptId
      `;
      const checkResult = (await this.neo4jService.read(checkQuery, { conceptId })) as Record<string, any>[];
      
      if (!checkResult || checkResult.length === 0) {
        throw new NotFoundException(`Syllabus concept with ID ${conceptId} not found`);
      }

      // Delete the concept and all its children recursively using DETACH DELETE
      // This will automatically remove all relationships and child nodes
      const deleteQuery = `
        MATCH (c:SyllabusConcept {conceptId: $conceptId})
        OPTIONAL MATCH (c)-[:CONTAINS*]->(child:SyllabusConcept)
        DETACH DELETE c, child
      `;
      await this.neo4jService.write(deleteQuery, { conceptId });

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusService',
        'Successfully deleted syllabus concept',
        { conceptId },
      );
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      LoggerUtil.logError(
        this.logger,
        'SyllabusService',
        'Failed to delete syllabus concept',
        error,
        { conceptId },
      );
      throw new InternalServerErrorException('Failed to delete syllabus concept');
    }
  }
}