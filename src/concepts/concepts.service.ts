/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { PinoLogger } from 'nestjs-pino';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { LoggerUtil } from '../common/utils/logger.util';

@Injectable()
export class ConceptsService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly neo4j: Neo4jService,
  ) {
    this.logger.setContext(ConceptsService.name);
  }

  async createConcept(createConceptDto: CreateConceptDto, adminId: string) {
    LoggerUtil.logInfo(this.logger, 'ConceptsService', 'Creating concept', {
      conceptId: createConceptDto.conceptId,
      name: createConceptDto.name,
      type: createConceptDto.type,
      adminId,
    });

    const findConcept = `
            MATCH (c:SyllabusConcept {conceptId: $conceptId})
            RETURN c
        `;

    const createConcept = `
            CREATE (c:SyllabusConcept {
                conceptId: $conceptId,
                name: $name,
                type: $type,
                description: $description,
                createdAt: $createdAt
            })
            RETURN c
        `;

    const createRelationship = `
            MATCH (c:SyllabusConcept {conceptId: $conceptId})
            MATCH (p:SyllabusConcept {conceptId: $parentId})
            CREATE (p)-[:CONTAINS]->(c)
            RETURN p, c
        `;

    const session = this.neo4j.getSession();
    const tx = session.beginTransaction();
    try {
      const existingConcept = await tx.run(findConcept, {
        conceptId: createConceptDto.conceptId,
      });

      if (existingConcept.records.length > 0) {
        LoggerUtil.logWarn(
          this.logger,
          'ConceptsService',
          'Concept already exists',
          { conceptId: createConceptDto.conceptId },
        );
        throw new Error(
          `Concept with ID ${createConceptDto.conceptId} already exists.`,
        );
      }

      const newConcept = await tx.run(createConcept, {
        conceptId: createConceptDto.conceptId,
        name: createConceptDto.name,
        type: createConceptDto.type,
        description: createConceptDto.description || null,
        createdAt: new Date().toISOString(),
      });

      if (createConceptDto.parentId) {
        const parent = await tx.run(findConcept, {
          conceptId: createConceptDto.parentId,
        });

        if (parent.records.length === 0) {
          LoggerUtil.logWarn(
            this.logger,
            'ConceptsService',
            'Parent concept not found',
            { parentId: createConceptDto.parentId },
          );
          throw new Error(
            `Parent concept with ID ${createConceptDto.parentId} does not exist.`,
          );
        }

        // Create relationship between new concept and parent
        await tx.run(createRelationship, {
          conceptId: createConceptDto.conceptId,
          parentId: createConceptDto.parentId,
        });
      }
      await tx.commit();

      return newConcept.records[0]?.get('c').properties;
    } catch (error) {
      await tx.rollback();
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Error creating concept',
        error,
        { conceptId: createConceptDto.conceptId, adminId },
      );
      throw new Error(
        `Error creating concept with ID ${createConceptDto.conceptId}.`,
      );
    } finally {
      await session.close();
    }
  }

  async updateConcept(
    id: string,
    updateConceptDto: UpdateConceptDto,
    adminId: string,
  ) {
    // Validate input
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Concept ID cannot be empty');
    }

    if (!updateConceptDto || Object.keys(updateConceptDto).length === 0) {
      throw new BadRequestException('Update data cannot be empty');
    }

    LoggerUtil.logInfo(this.logger, 'ConceptsService', 'Updating concept', {
      conceptId: id,
      updateData: updateConceptDto,
      adminId,
    });

    const findConceptQuery = `
            MATCH (c:SyllabusConcept {conceptId: $conceptId})
            RETURN c
        `;

    const updateConceptQuery = `
            MATCH (c:SyllabusConcept {conceptId: $conceptId})
            SET c.name = COALESCE($name, c.name),
                c.type = COALESCE($type, c.type),
                c.description = COALESCE($description, c.description)
            RETURN c
        `;

    const removeExistingRelationshipQuery = `
            MATCH (p:Concept)-[r:CONSISTS]->(c:Concept {id: $id})
            DELETE r
        `;

    const createParentRelationshipQuery = `
            MATCH (c:Concept {id: $id})
            MATCH (p:Concept {id: $parentId})
            CREATE (p)-[:CONSISTS]->(c)
            RETURN p, c
        `;

    const session = this.neo4j.getSession();
    const tx = session.beginTransaction();
    try {
      // Check if concept exists
      const existingConceptResult = await tx.run(findConceptQuery, { conceptId: id });

      if (existingConceptResult.records.length === 0) {
        LoggerUtil.logWarn(
          this.logger,
          'ConceptsService',
          'Concept not found for update',
          { conceptId: id },
        );
        throw new NotFoundException(`Concept with ID ${id} not found.`);
      }

      // Update concept properties
      const updatedConceptResult = await tx.run(updateConceptQuery, {
        id,
        name: updateConceptDto.name || null,
        type: updateConceptDto.type || null,
      });

      // Handle parent relationship update
      if (updateConceptDto.hasOwnProperty('parentId')) {
        // Remove existing parent relationships first
        await tx.run(removeExistingRelationshipQuery, { id });

        // If parentId is provided and not null/empty, create new relationship
        if (
          updateConceptDto.parentId &&
          updateConceptDto.parentId.trim() !== ''
        ) {
          // Check if parent exists
          const parentResult = await tx.run(findConceptQuery, {
            conceptId: updateConceptDto.parentId,
          });

          if (parentResult.records.length === 0) {
            LoggerUtil.logWarn(
              this.logger,
              'ConceptsService',
              'Parent concept not found for update',
              { parentId: updateConceptDto.parentId },
            );
            throw new NotFoundException(
              `Parent concept with ID ${updateConceptDto.parentId} does not exist.`,
            );
          }

          // Create new parent relationship
          await tx.run(createParentRelationshipQuery, {
            id,
            parentId: updateConceptDto.parentId,
          });
        }
        // If parentId is null, empty, or undefined, we just remove the relationship (already done above)
      }

      await tx.commit();

      return updatedConceptResult.records[0]?.get('c').properties;
    } catch (error) {
      await tx.rollback();
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Error updating concept',
        error,
        { conceptId: id, adminId },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // For any other errors, throw internal server error
      throw new InternalServerErrorException(
        `Failed to update concept with ID ${id}. Please try again.`,
      );
    } finally {
      await session.close();
    }
  }

  async createPrerequisiteRelationship(
    conceptId: string,
    prerequisiteId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    // Validate input
    if (!conceptId || conceptId.trim().length === 0) {
      throw new BadRequestException('Concept ID cannot be empty');
    }

    if (!prerequisiteId || prerequisiteId.trim().length === 0) {
      throw new BadRequestException('Prerequisite ID cannot be empty');
    }

    LoggerUtil.logInfo(
      this.logger,
      'ConceptsService',
      'Creating prerequisite relationship',
      {
        conceptId,
        prerequisiteId,
        adminId,
      },
    );

    const findConceptQuery = `
            MATCH (c:Concept {id: $id})
            RETURN c
        `;

    const checkExistingRelationshipQuery = `
            MATCH (c:Concept {id: $conceptId})-[r:HAS_PREREQUISITE]->(p:Concept {id: $prerequisiteId})
            RETURN r
        `;

    const createPrerequisiteRelationshipQuery = `
            MATCH (c:Concept {id: $conceptId})
            MATCH (p:Concept {id: $prerequisiteId})
            CREATE (c)-[:HAS_PREREQUISITE]->(p)
            RETURN c, p
        `;

    const session = this.neo4j.getSession();
    const tx = session.beginTransaction();
    try {
      // Check if both concepts exist
      const conceptResult = await tx.run(findConceptQuery, { conceptId: conceptId });
      if (conceptResult.records.length === 0) {
        LoggerUtil.logWarn(
          this.logger,
          'ConceptsService',
          'Concept not found for prerequisite',
          { conceptId },
        );
        throw new NotFoundException(`Concept with ID ${conceptId} not found.`);
      }

      const prerequisiteResult = await tx.run(findConceptQuery, {
        conceptId: prerequisiteId,
      });
      if (prerequisiteResult.records.length === 0) {
        LoggerUtil.logWarn(
          this.logger,
          'ConceptsService',
          'Prerequisite concept not found',
          { prerequisiteId },
        );
        throw new NotFoundException(
          `Prerequisite concept with ID ${prerequisiteId} not found.`,
        );
      }

      // Check if relationship already exists
      const existingRelationshipResult = await tx.run(
        checkExistingRelationshipQuery,
        {
          conceptId,
          prerequisiteId,
        },
      );

      if (existingRelationshipResult.records.length > 0) {
        LoggerUtil.logWarn(
          this.logger,
          'ConceptsService',
          'Prerequisite relationship already exists',
          { conceptId, prerequisiteId },
        );
        throw new BadRequestException(
          `Prerequisite relationship already exists between these concepts.`,
        );
      }

      // Create the prerequisite relationship
      const relationshipResult = await tx.run(
        createPrerequisiteRelationshipQuery,
        {
          conceptId,
          prerequisiteId,
        },
      );

      if (relationshipResult.records.length === 0) {
        throw new Error('Failed to create prerequisite relationship');
      }

      await tx.commit();

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsService',
        'Prerequisite relationship created successfully',
        { conceptId, prerequisiteId },
      );
      return { message: 'Prerequisite relationship created successfully' };
    } catch (error) {
      await tx.rollback();
      LoggerUtil.logError(
        this.logger,
        'ConceptsService',
        'Error creating prerequisite relationship',
        error,
        { conceptId, prerequisiteId, adminId },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // For any other errors, throw internal server error
      throw new InternalServerErrorException(
        `Failed to create prerequisite relationship. Please try again.`,
      );
    } finally {
      await session.close();
    }
  }
}
