import { Logger } from "nestjs-pino";
import { Injectable } from "@nestjs/common";
import { Neo4jService } from "../common/neo4j/neo4j.service";
import { CreateConceptDto } from "./dto/create-concept.dto";
import { Concept } from "../libs/shared-types/graph-model";

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
       this.logger.log(`Creating concept with data: ${JSON.stringify(CreateConceptDto)} by ${adminId}`, ConceptsService.name);

        const findConcept = `
            MATCH (c:Concept {id: $id})
            RETURN c
        `;

        const createConcept = `
            CREATE (c:Concept {
                id: $id,
                name: $name,
                type: $type,
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

            if (createConceptDto.dependantConceptId) {
                const parent = await tx.run(findConcept, {
                    id: createConceptDto.dependantConceptId,
                });

                if (parent.records.length === 0) {
                    this.logger.warn(`Parent concept with ID ${createConceptDto.dependantConceptId} does not exist.`, ConceptsService.name);
                    throw new Error(`Parent concept with ID ${createConceptDto.dependantConceptId} does not exist.`);
                }

                // Create relationship between new concept and parent
                await tx.run(createRelationship, {
                    id: createConceptDto.id,
                    parentId: parent.records[0].get("c").id,
                });
            }
            await tx.commit();

            return newConcept;
        } catch (error) {
            await tx.rollback();
            this.logger.error(`Error creating concept: ${error.message}`, error.stack, ConceptsService.name);
            throw new Error(`Error creating concept with ID ${createConceptDto.id}.`);
        } finally {
            await session.close();
        }
    }

}
