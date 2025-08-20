# O/L Mathematics Platform - Content Service

## Overview

The `content-service` is the central library and the "brain" of the educational platform[cite: 1147]. It uses a graph database to model the entire Mathematics syllabus, manage all learning resources (videos, notes, quizzes), and track the knowledge state of every student[cite: 1148].

---

### Core Responsibilities

***Syllabus & Knowledge Graph Management:** Manages the entire mathematical syllabus as a graph structure (Neo4j), defining concepts (Particles, Atoms, Molecules) and their relationships (`HAS_PREREQUISITE`, `CONTAINS`)[cite: 1149, 1153, 1160, 1161].
***Learning Resource Management:** Manages the lifecycle of all learning resources (`Resource`, `Quiz`, `Question` nodes)[cite: 1154, 1155, 1156]. Metadata is stored directly in the graph, while files are stored in blob storage.
***Student Knowledge State Tracking:** Manages the relationships between students and concepts they have interacted with or mastered (`HAS_MASTERED`, `ATTEMPTED_QUIZ`)[cite: 1168, 1169].
***Serving Personalized Content:** Provides APIs for clients to retrieve syllabus data, resources, and personalized learning paths[cite: 1229, 1233, 1252].

---

### Technology Stack

* **Language/Framework:** [e.g., Node.js with NestJS]
* **Databases:**
    ***Graph (Primary Database):** Neo4j [cite: 1149]
* **File Storage:** AWS S3 (or compatible equivalent)
* **Containerization:** Docker

---

## Docker Deployment

### Building the Docker Image

The service includes a multi-stage Dockerfile optimized for production:

```bash
# Build the Docker image
docker build -t content-service:latest .
```

### Local Development with Docker Compose

For local development with Neo4j database:

```bash
# Start all services (content-service + Neo4j)
docker-compose up -d

# View logs
docker-compose logs -f content-service

# Stop all services
docker-compose down
```

The development setup includes:
- Content Service on `http://localhost:3000`
- Neo4j Browser on `http://localhost:7474` (username: `neo4j`, password: `password`)

### Production Deployment

For production deployment:

```bash
# Build for production
docker build -t content-service:latest .

# Run with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Required environment variables for production:

```bash
NODE_ENV=production
PORT=3000
NEO4J_URI=bolt://your-neo4j-host:7687
NEO4J_USERNAME=your-username
NEO4J_PASSWORD=your-password
```

### AWS ECR Deployment

The service is configured for automatic deployment to AWS ECR via GitHub Actions:

1. Push to `main` branch triggers the workflow
2. Docker image is built and tagged with commit SHA
3. Image is pushed to ECR repository: `ecs-multi-app-dev-content-service`
4. Both versioned (`<commit-sha>`) and `latest` tags are created

### Health Check

The Docker image includes a built-in health check that monitors the `/health` endpoint:

```bash
# Manual health check
curl http://localhost:3000/health
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm
- Neo4j (or use Docker Compose)