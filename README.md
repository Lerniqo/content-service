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