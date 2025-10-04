/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateResourceResponseDto } from './dto/create-resource-response.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
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

      // Create [:PUBLISHED] relationship between User and Resource
      await this.createPublishedRelationship(userId, resourceId);

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

  async updateResource(
    resourceId: string,
    updateResourceDto: UpdateResourceDto,
    userId: string,
    userRole: string[],
  ): Promise<Record<string, any>> {
    LoggerUtil.logInfo(
      this.logger,
      'ResourcesService',
      'Updating resource',
      {
        resourceId,
        userId,
        userRole,
        updates: Object.keys(updateResourceDto),
      },
    );

    try {
      // First, check if resource exists and get current data
      const currentResource = await this.getResourceById(resourceId);
      
      if (!currentResource) {
        throw new NotFoundException(`Resource with ID ${resourceId} not found`);
      }

      // Check authorization: Admin can update any resource, Teacher can only update resources they have [:PUBLISHED] relationship with
      const canUpdate = await this.canUpdateResource(userRole, resourceId, userId);
      if (!canUpdate) {
        throw new ForbiddenException(
          'Access denied. You can only update resources that you published.'
        );
      }

      // Update the resource with provided fields
      const updatedResource = await this.performResourceUpdate(
        resourceId,
        updateResourceDto,
      );

      LoggerUtil.logInfo(
        this.logger,
        'ResourcesService',
        'Resource updated successfully',
        { resourceId, userId },
      );

      return updatedResource;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Failed to update resource',
        error,
        { resourceId, userId, updates: Object.keys(updateResourceDto) },
      );
      throw error;
    }
  }

  private async getResourceById(resourceId: string): Promise<Record<string, any> | null> {
    const query = `
      MATCH (r:Resource {resourceId: $resourceId})
      RETURN r {
        .*,
        updatedAt: datetime().epochSeconds
      } as resource
    `;

    try {
      const result = (await this.neo4jService.read(query, {
        resourceId,
      })) as Record<string, any>[];

      return result.length > 0 ? result[0].resource as Record<string, any> : null;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error fetching resource by ID',
        error,
        { resourceId },
      );
      throw new InternalServerErrorException('Failed to fetch resource');
    }
  }

  private async canUpdateResource(
    userRole: string[],
    resourceId: string,
    userId: string,
  ): Promise<boolean> {
    // Admin can update any resource
    if (userRole.includes('admin')) {
      return true;
    }

    // Teacher can only update resources they have a [:PUBLISHED] relationship with
    if (userRole.includes('teacher')) {
      return await this.hasPublishedRelationship(userId, resourceId);
    }

    return false;
  }

  private async hasPublishedRelationship(userId: string, resourceId: string): Promise<boolean> {
    // First, check if we need to create a User node for this user
    await this.ensureUserNodeExists(userId);

    // Now check for the [:PUBLISHED] relationship
    const query = `
      MATCH (u:User {userId: $userId})-[:PUBLISHED]->(r:Resource {resourceId: $resourceId})
      RETURN count(r) as relationshipCount
    `;

    try {
      const result = (await this.neo4jService.read(query, {
        userId,
        resourceId,
      })) as Record<string, any>[];

      const relationshipCount = (result[0]?.relationshipCount as number) || 0;
      return relationshipCount > 0;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error checking PUBLISHED relationship',
        error,
        { userId, resourceId },
      );
      return false;
    }
  }

  private async createPublishedRelationship(userId: string, resourceId: string): Promise<void> {
    // First ensure the user node exists
    await this.ensureUserNodeExists(userId);

    const query = `
      MATCH (u:User {userId: $userId})
      MATCH (r:Resource {resourceId: $resourceId})
      CREATE (u)-[:PUBLISHED]->(r)
      RETURN r.resourceId as resourceId
    `;

    try {
      const result = (await this.neo4jService.write(query, {
        userId,
        resourceId,
      })) as Record<string, any>[];

      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create PUBLISHED relationship',
        );
      }

      LoggerUtil.logDebug(
        this.logger,
        'ResourcesService',
        'PUBLISHED relationship created successfully',
        { userId, resourceId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error creating PUBLISHED relationship',
        error,
        { userId, resourceId },
      );

      throw new InternalServerErrorException(
        'Failed to create PUBLISHED relationship',
      );
    }
  }

  private async ensureUserNodeExists(userId: string): Promise<void> {
    const query = `
      MERGE (u:User {userId: $userId})
      RETURN u.userId as userId
    `;

    try {
      await this.neo4jService.write(query, { userId });
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error ensuring user node exists',
        error,
        { userId },
      );
      // Don't throw here as this is not critical for the update operation
    }
  }

  private async performResourceUpdate(
    resourceId: string,
    updateResourceDto: UpdateResourceDto,
  ): Promise<Record<string, any>> {
    // Build the SET clause dynamically based on provided fields
    const updateFields: string[] = [];
    const params: Record<string, any> = { resourceId };

    // Only update fields that are provided in the DTO
    if (updateResourceDto.name !== undefined) {
      updateFields.push('r.name = $name');
      params.name = updateResourceDto.name;
    }
    if (updateResourceDto.type !== undefined) {
      updateFields.push('r.type = $type');
      params.type = updateResourceDto.type;
    }
    if (updateResourceDto.description !== undefined) {
      updateFields.push('r.description = $description');
      params.description = updateResourceDto.description;
    }
    if (updateResourceDto.url !== undefined) {
      updateFields.push('r.url = $url');
      params.url = updateResourceDto.url;
    }
    if (updateResourceDto.isPublic !== undefined) {
      updateFields.push('r.isPublic = $isPublic');
      params.isPublic = updateResourceDto.isPublic;
    }
    if (updateResourceDto.price !== undefined) {
      updateFields.push('r.price = $price');
      params.price = updateResourceDto.price;
    }
    if (updateResourceDto.tags !== undefined) {
      updateFields.push('r.tags = $tags');
      params.tags = updateResourceDto.tags;
    }
    if (updateResourceDto.gradeLevel !== undefined) {
      updateFields.push('r.gradeLevel = $gradeLevel');
      params.gradeLevel = updateResourceDto.gradeLevel;
    }
    if (updateResourceDto.subject !== undefined) {
      updateFields.push('r.subject = $subject');
      params.subject = updateResourceDto.subject;
    }

    // Always update the updatedAt timestamp
    updateFields.push('r.updatedAt = $updatedAt');
    params.updatedAt = new Date().toISOString();

    if (updateFields.length === 1) {
      // Only updatedAt field - no actual updates provided
      throw new InternalServerErrorException('No valid fields provided for update');
    }

    const query = `
      MATCH (r:Resource {resourceId: $resourceId})
      SET ${updateFields.join(', ')}
      RETURN r {
        .*,
        updatedAt: r.updatedAt
      } as resource
    `;

    try {
      const result = (await this.neo4jService.write(query, params)) as Record<string, any>[];

      if (result.length === 0) {
        throw new InternalServerErrorException('Failed to update resource');
      }

      LoggerUtil.logDebug(
        this.logger,
        'ResourcesService',
        'Resource updated in database',
        { resourceId, updateFields },
      );

      return result[0].resource as Record<string, any>;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesService',
        'Error updating resource in database',
        error,
        { resourceId, updateFields },
      );
      throw new InternalServerErrorException('Failed to update resource');
    }
  }

  private async cleanupPartialResource(resourceId: string): Promise<void> {
    const query = `
      MATCH (r:Resource {resourceId: $resourceId})
      DETACH DELETE r
    `;

    try {
      (await this.neo4jService.write(query, { resourceId })) as Record<string, any>[];
      
      LoggerUtil.logInfo(
        this.logger,
        'ResourcesService',
        'Cleaned up partial resource and all relationships',
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
