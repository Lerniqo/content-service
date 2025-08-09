import { Logger } from "nestjs-pino";
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { Neo4jService } from "../common/neo4j/neo4j.service";
import { CreateConceptDto } from "./dto/create-concept.dto";
import { UpdateConceptDto } from "./dto/update-concept.dto";

@Injectable()
export class ConceptsService {
    constructor(
        private readonly logger: Logger,
        private readonly neo4j: Neo4jService,
    ){}

    async createConcept(
        createConceptDto: CreateConceptDto,
        adminId: string,
    ){
       this.logger.log(`Creating concept with data: ${JSON.stringify(createConceptDto)} by ${adminId}`, ConceptsService.name);

        const findConcept = `
            MATCH (c:Concept {id: $id})
            RETURN c
        `;

        const createConcept = `
            CREATE (c:Concept {
                id: $id,
                name: $name,
                type: $type
            })
            RETURN c
        `;

        const createRelationship = `
            MATCH (c:Concept {id: $id})
            MATCH (p:Concept {id: $parentId})
            CREATE (p)-[:CONSISTS]->(c)
            RETURN p, c
        `;

        const session = this.neo4j.getSession();
        const tx = session.beginTransaction();
        try {
            const existingConcept = await tx.run(findConcept, {
                id: createConceptDto.id
            });
            
            if (existingConcept.records.length > 0) {
                this.logger.warn(`Concept with ID ${createConceptDto.id} already exists.`, ConceptsService.name);
                throw new Error(`Concept with ID ${createConceptDto.id} already exists.`);
            }

            const newConcept = await tx.run(createConcept, {
                id: createConceptDto.id,
                name: createConceptDto.name,
                type: createConceptDto.type,
            });

            if (createConceptDto.parentId) {
                const parent = await tx.run(findConcept, {
                    id: createConceptDto.parentId,
                });

                if (parent.records.length === 0) {
                    this.logger.warn(`Parent concept with ID ${createConceptDto.parentId} does not exist.`, ConceptsService.name);
                    throw new Error(`Parent concept with ID ${createConceptDto.parentId} does not exist.`);
                }

                // Create relationship between new concept and parent
                await tx.run(createRelationship, {
                    id: createConceptDto.id,
                    parentId: createConceptDto.parentId,
                });
            }
            await tx.commit();

            return newConcept.records[0]?.get("c").properties;
        } catch (error) {
            await tx.rollback();
            this.logger.error(`Error creating concept: ${error.message}`, error.stack, ConceptsService.name);
            throw new Error(`Error creating concept with ID ${createConceptDto.id}.`);
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

        this.logger.log(`Updating concept ${id} with data: ${JSON.stringify(updateConceptDto)} by ${adminId}`, ConceptsService.name);

        const findConceptQuery = `
            MATCH (c:Concept {id: $id})
            RETURN c
        `;

        const updateConceptQuery = `
            MATCH (c:Concept {id: $id})
            SET c.name = COALESCE($name, c.name),
                c.type = COALESCE($type, c.type)
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
            const existingConceptResult = await tx.run(findConceptQuery, { id });
            
            if (existingConceptResult.records.length === 0) {
                this.logger.warn(`Concept with ID ${id} not found.`, ConceptsService.name);
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
                if (updateConceptDto.parentId && updateConceptDto.parentId.trim() !== '') {
                    // Check if parent exists
                    const parentResult = await tx.run(findConceptQuery, {
                        id: updateConceptDto.parentId,
                    });

                    if (parentResult.records.length === 0) {
                        this.logger.warn(`Parent concept with ID ${updateConceptDto.parentId} does not exist.`, ConceptsService.name);
                        throw new NotFoundException(`Parent concept with ID ${updateConceptDto.parentId} does not exist.`);
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

            return updatedConceptResult.records[0]?.get("c").properties;
        } catch (error) {
            await tx.rollback();
            this.logger.error(`Error updating concept: ${error.message}`, error.stack, ConceptsService.name);
            
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            
            // For any other errors, throw internal server error
            throw new InternalServerErrorException(`Failed to update concept with ID ${id}. Please try again.`);
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

        this.logger.log(`Creating prerequisite relationship: ${conceptId} -> ${prerequisiteId} by ${adminId}`, ConceptsService.name);

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
            const conceptResult = await tx.run(findConceptQuery, { id: conceptId });
            if (conceptResult.records.length === 0) {
                this.logger.warn(`Concept with ID ${conceptId} not found.`, ConceptsService.name);
                throw new NotFoundException(`Concept with ID ${conceptId} not found.`);
            }

            const prerequisiteResult = await tx.run(findConceptQuery, { id: prerequisiteId });
            if (prerequisiteResult.records.length === 0) {
                this.logger.warn(`Prerequisite concept with ID ${prerequisiteId} not found.`, ConceptsService.name);
                throw new NotFoundException(`Prerequisite concept with ID ${prerequisiteId} not found.`);
            }

            // Check if relationship already exists
            const existingRelationshipResult = await tx.run(checkExistingRelationshipQuery, {
                conceptId,
                prerequisiteId,
            });

            if (existingRelationshipResult.records.length > 0) {
                this.logger.warn(`Prerequisite relationship already exists between ${conceptId} and ${prerequisiteId}.`, ConceptsService.name);
                throw new BadRequestException(`Prerequisite relationship already exists between these concepts.`);
            }

            // Create the prerequisite relationship
            const relationshipResult = await tx.run(createPrerequisiteRelationshipQuery, {
                conceptId,
                prerequisiteId,
            });

            if (relationshipResult.records.length === 0) {
                throw new Error('Failed to create prerequisite relationship');
            }

            await tx.commit();

            this.logger.log(`Prerequisite relationship created successfully: ${conceptId} -> ${prerequisiteId}`, ConceptsService.name);
            return { message: "Prerequisite relationship created successfully" };

        } catch (error) {
            await tx.rollback();
            this.logger.error(`Error creating prerequisite relationship: ${error.message}`, error.stack, ConceptsService.name);
            
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            
            // For any other errors, throw internal server error
            throw new InternalServerErrorException(`Failed to create prerequisite relationship. Please try again.`);
        } finally {
            await session.close();
        }
    }

}
