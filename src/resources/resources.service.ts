/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateResourceResponseDto } from './dto/create-resource-response.dto';
import { LoggerUtil } from '../common/utils/logger.util';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResourcesService.name);
  }

  async createResource(
    createResourceDto: CreateResourceDto,
    userId: string,
  ): Promise<CreateResourceResponseDto> {
    const resourceId = createResourceDto.resourceId;
    
    LoggerUtil.logInfo(
      this.logger,
      'ResourcesService',
      'Creating new resource',
      {
        resourceId,
        conceptId: createResourceDto.conceptId,
        userId,
        resourceName: createResourceDto.name,
      },
    );

    try {
      // First, verify that the concept exists
      await this.verifyConceptExists(createResourceDto.conceptId);

      // Note: User authentication and authorization is handled by API Gateway
      // and verified by the RolesGuard, so no database verification needed

      // Create the Resource node
      await this.createResourceNode(resourceId, createResourceDto, userId);

      // Create EXPLAINS relationship from Concept to Resource
      await this.createExplainsRelationship(
        createResourceDto.conceptId,
        resourceId,
      );

      // Note: User ID is stored as publishedBy property on Resource node
      // since users are managed by API Gateway, not in Neo4j database

      // Generate presigned URL for file upload
      const uploadUrl = this.generatePresignedUrl(resourceId);

      LoggerUtil.logInfo(
        this.logger,
        'ResourcesService',
        'Resource created successfully',
        { resourceId, userId },
      );

      return new CreateResourceResponseDto(resourceId, uploadUrl);
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Failed to create resource',
        error,
        { resourceId, userId, conceptId: createResourceDto.conceptId },
      );
      
      // Cleanup: attempt to remove any partially created data
      await this.cleanupPartialResource(resourceId);
      
      throw error;
    }
  }

  private async verifyConceptExists(conceptId: string): Promise<void> {
    const query = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      RETURN c.conceptId as conceptId
    `;

    try {
      const result = (await this.neo4jService.read(query, {
        conceptId,
      })) as any[];
      
      if (result.length === 0) {
        throw new NotFoundException(`Concept with ID ${conceptId} not found`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error verifying concept existence',
        error,
        { conceptId },
      );
      
      throw new InternalServerErrorException(
        'Failed to verify concept existence',
      );
    }
  }

  private async createResourceNode(
    resourceId: string,
    createResourceDto: CreateResourceDto,
    userId: string,
  ): Promise<void> {
    const query = `
      CREATE (r:Resource {
        resourceId: $resourceId,
        name: $name,
        type: $type,
        description: $description,
        url: $url,
        isPublic: $isPublic,
        price: $price,
        tags: $tags,
        createdAt: $createdAt,
        gradeLevel: $gradeLevel,
        subject: $subject,
        publishedBy: $publishedBy
      })
      RETURN r.resourceId as resourceId
    `;

    const params = {
      resourceId: createResourceDto.resourceId,
      name: createResourceDto.name,
      type: createResourceDto.type,
      description: createResourceDto.description || null,
      url: createResourceDto.url,
      isPublic: createResourceDto.isPublic,
      price: createResourceDto.price || null,
      tags: createResourceDto.tags || [],
      createdAt: createResourceDto.createdAt ? new Date(createResourceDto.createdAt).toISOString() : new Date().toISOString(),
      gradeLevel: createResourceDto.gradeLevel || null,
      subject: createResourceDto.subject || null,
      publishedBy: userId,
    };

    try {
      const result = (await this.neo4jService.write(query, params)) as any[];
      
      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create resource node',
        );
      }
      
      LoggerUtil.logDebug(
        this.logger,
        'ResourcesService',
        'Resource node created successfully',
        { resourceId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error creating resource node',
        error,
        { resourceId, params },
      );
      
      throw new InternalServerErrorException('Failed to create resource node');
    }
  }

  private async createExplainsRelationship(
    conceptId: string,
    resourceId: string,
  ): Promise<void> {
    const query = `
      MATCH (c:SyllabusConcept {conceptId: $conceptId})
      MATCH (r:Resource {resourceId: $resourceId})
      CREATE (c)-[:EXPLAINS]->(r)
      RETURN r.resourceId as resourceId
    `;

    try {
      const result = (await this.neo4jService.write(query, {
        conceptId,
        resourceId,
      })) as any[];
      
      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create EXPLAINS relationship',
        );
      }
      
      LoggerUtil.logDebug(
        this.logger,
        'ResourcesService',
        'EXPLAINS relationship created successfully',
        { conceptId, resourceId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error creating EXPLAINS relationship',
        error,
        { conceptId, resourceId },
      );
      
      throw new InternalServerErrorException(
        'Failed to create EXPLAINS relationship',
      );
    }
  }

  private generatePresignedUrl(resourceId: string): string {
    try {
      // TODO: Implement actual cloud storage presigned URL generation
      // This is a placeholder implementation that should be replaced
      // with actual AWS S3, Google Cloud Storage, or Azure Blob Storage integration
      
      const timestamp = Date.now();
      const mockUploadUrl = `https://api-gateway.example.com/upload/${resourceId}?timestamp=${timestamp}&signature=mock-signature`;
      
      LoggerUtil.logInfo(
        this.logger,
        'ResourcesService',
        'Generated presigned URL (mock implementation)',
        { resourceId, uploadUrl: mockUploadUrl },
      );
      
      return mockUploadUrl;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error generating presigned URL',
        error,
        { resourceId },
      );
      
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  private async cleanupPartialResource(resourceId: string): Promise<void> {
    const query = `
      MATCH (r:Resource {resourceId: $resourceId})
      DETACH DELETE r
    `;

    try {
      (await this.neo4jService.write(query, { resourceId })) as any[];
      
      LoggerUtil.logInfo(
        this.logger,
        'ResourcesService',
        'Cleaned up partial resource',
        { resourceId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Failed to cleanup partial resource',
        error,
        { resourceId },
      );
    }
  }
}
