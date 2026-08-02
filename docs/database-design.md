# JobPilot AI — Database Architecture & Schema Specification

**Document Version:** `2.4.0-PROD`  
**Status:** Approved for Production  
**Target Systems:** MongoDB Atlas Enterprise (`M30` Cluster, Multi-Region AWS us-east-1 / us-west-2), FastAPI (`Motor 3.4+` Async Driver), React + TypeScript Frontend Applications  
**Primary Architect:** Senior Database & Systems Infrastructure Group  

---

## Table of Contents
1. [Database Overview & System Architecture](#1-database-overview--system-architecture)
2. [Collection Design Architecture](#2-collection-design-architecture)
3. [Field Definitions & Schema Specifications](#3-field-definitions--schema-specifications)
4. [Data Types & BSON Specifications](#4-data-types--bson-specifications)
5. [JSON Schema Validation Rules (`$jsonSchema`)](#5-json-schema-validation-rules-jsonschema)
6. [Data Relationships & Embedding Patterns](#6-data-relationships--embedding-patterns)
7. [Indexing Strategy & Atlas Vector Search Specs](#7-indexing-strategy--atlas-vector-search-specs)
8. [Security, Privacy & Encryption (CSFLE)](#8-security-privacy--encryption-csfle)
9. [Query Optimization & FastAPI Motor Patterns](#9-query-optimization--fastapi-motor-patterns)
10. [Scalability & Sharding Strategy](#10-scalability--sharding-strategy)
11. [Future Collections & System Roadmap](#11-future-collections--system-roadmap)
12. [Complete Production Sample Documents](#12-complete-production-sample-documents)
13. [Naming & Structural Conventions](#13-naming--structural-conventions)

---

## 1. Database Overview & System Architecture

### 1.1 Executive Summary
**JobPilot AI** is an AI-native career automation and job discovery engine. The backend infrastructure is designed to serve over **500,000 active job seekers** handling real-time job scraping ingest, LLM-driven resume tailoring, semantic vector matching, application tracking pipelines, and automated interview simulation.

### 1.2 Technology Selection Justification
To accommodate the high variability of unstructured resumes, multi-source job postings, dynamic AI generated content, and high-dimensional semantic vectors, **MongoDB Atlas** was selected over traditional relational databases (e.g., PostgreSQL/MySQL).

| Requirement Dimension | Relational Database (PostgreSQL) | Document Store (MongoDB Atlas) | Architectural Decision Justification |
| :--- | :--- | :--- | :--- |
| **Resume & Experience Schema** | Fixed tables require complex JOINs across 6+ child tables (`work_history`, `education`, `skills`, `projects`, `certifications`). | Embedded document trees inside a single atomic `resumes` document. | **MongoDB Selected**: Eliminates costly relational JOINs. Retrieving a full resume profile requires a single primary key lookup (`O(1)` time complexity). |
| **Job Description Parsing** | Non-uniform scraped fields require frequent DDL migrations or `JSONB` columns without strict schema enforcement. | Flexible BSON schemas with MongoDB `$jsonSchema` validators for structured fields. | **MongoDB Selected**: Allows rapid ingestion of diverse job board payloads while guaranteeing critical invariant fields via `$jsonSchema`. |
| **Semantic AI & Matching** | Requires external vector database integration (e.g. Pinecone, Weaviate) alongside standard Postgres. | **Atlas Vector Search** integrated directly alongside operational transactional data. | **MongoDB Selected**: Unified operational and vector store reduces operational complexity, network latency, and synchronization overhead. |
| **Write Throughput** | Row-level locks and foreign key constraint validations impede bulk ingest performance. | High-throughput document writes with document-level concurrency control (WiredTiger engine). | **MongoDB Selected**: Supports 10,000+ writes/sec during real-time job scraping ingest pipelines without locking user reads. |

### 1.3 Tech Stack Architectural Integration

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React + TypeScript Frontend                     │
│  - Form state management & dynamic resume preview                      │
│  - Application pipeline Kanban drag-and-drop                           │
│  - Real-time SSE/WebSocket stream for AI generated content             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / REST & WSS
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Async Python Engine                     │
│  - Motor 3.4+ (Async AsyncIO PyMongo Driver)                           │
│  - Pydantic v2 data models for request validation & DTO serialization  │
│  - Async task queues for LLM tailoring & embedding generation          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Motor Driver (TLS 1.3, Auth SCRAM-SHA-256)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Atlas M30 Cluster                       │
│  - WiredTiger Storage Engine (Snappy Compression)                      │
│  - Atlas Search (Apache Lucene Indexing for Full-Text Search)          │
│  - Atlas Vector Search (KNN HNSW for 1536-dim OpenAI/Gemini Embeddings)│
│  - CSFLE (Client-Side Field Level Encryption for PII)                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Workload Analysis & Sizing Estimates

* **Target Active User Base:** 500,000 users
* **Average Storage Per User:** ~2.5 MB (Master resumes, tailored variants, application histories, cover letters, mock interview transcripts)
* **Total Primary Storage Projection:** ~1.25 TB (Data) + 380 GB (Indexes + Vector Embeddings)
* **Read / Write Workload Ratio:**
  * **Operational DB:** 82% Reads / 18% Writes
  * **Vector Search Engine:** 95% Reads / 5% Writes
* **Peak Write Bursts:** 12,000 operations/sec during automated nocturnal job aggregator ingest runs.

### 1.5 CAP Theorem & High Availability Topology
MongoDB Atlas is deployed in a **Replica Set topology** across 3 Availability Zones in AWS `us-east-1` (Primary, Secondary, Secondary) with an asynchronous cross-region read replica in AWS `us-west-2`.

* **Consistency vs Availability Trade-off:**
  * **Default Write Concern:** `w: "majority", j: true, wtimeoutMS: 5000` — Ensures zero data loss during primary failover by confirming writes to disk on a majority of nodes before returning success.
  * **Default Read Preference:** `primaryPreferred` for user transactional flows (e.g. editing resumes, submitting applications). `secondaryPreferred` for heavy analytical aggregation pipelines and semantic vector similarity searches to isolate read workloads from write locks.
* **ACID Transaction Strategy:** Multi-document sessions (`client.start_session()`) are utilized strictly for cross-collection workflows, such as simultaneously updating an `application` status, creating a new `tailored_resume`, and deducting AI credits in `users`.

---

## 2. Collection Design Architecture

The database comprises **8 core collections** optimized for domain isolation, atomic document operations, and minimal query latency.

```
                  ┌───────────────────────┐
                  │         users         │
                  └───────────┬───────────┘
                              │ 1:N
           ┌──────────────────┼──────────────────┐
           │ 1:N              │ 1:N              │ 1:N
           ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│     resumes      │ │   applications   │ │ user_analytics   │
└──────────┬───────┘ └────────┬─────────┘ └──────────────────┘
           │                  │
           │ 1:N              │ 1:1 (Snapshot)
           ▼                  ▼
┌──────────────────┐ ┌──────────────────┐
│ tailored_resumes │◄┤   job_postings   │
└──────────┬───────┘ └──────────────────┘
           │                  ▲
           │ 1:N              │ 1:N
           ▼                  │
┌──────────────────┐          │
│  cover_letters   │──────────┘
└──────────────────┘
```

| Collection Name | Functional Scope & Business Purpose | Growth Pattern | Storage Retention Policy |
| :--- | :--- | :--- | :--- |
| `users` | Primary user profile, authentication credentials, subscription tier, credits balance, OAuth tokens, and security flags. | Linear with user acquisition (`~500k` docs). | Indefinite (Purged on user account deletion request). |
| `resumes` | Master candidate resume documents containing nested work experience, education, skills, projects, and primary vector embedding. | High per user (`2-5` master versions per user). | Indefinite. |
| `job_postings` | Aggregated and scraped job descriptions, salary ranges, required skills, and 1536-dim semantic embeddings for vector matching. | Exponential (`~5M` active & historical postings). | Active jobs kept in primary tier; closed jobs > 180 days moved to Cold Storage. |
| `applications` | Candidate job application pipeline tracker (Kanban statuses: Bookmarked, Applied, Interviewing, Offered, Rejected) with embedded job snapshot. | Medium per user (`~50-300` applications per user). | Indefinite (User-controlled archive). |
| `tailored_resumes` | AI-customized resume documents dynamically altered for specific job posting IDs, complete with ATS match score analysis. | High growth (`~20-100` tailored resumes per active job seeker). | Retained for active applications; auto-archived after 1 year. |
| `cover_letters` | AI-generated personalized cover letters tied to targeted job postings with tone settings and edit histories. | High growth (`~20-100` cover letters per user). | Retained with application lifecycle. |
| `interview_prep` | AI mock interview sessions, generated practice questions, audio/text transcripts, STAR method evaluations, and clarity scores. | Medium growth (`~5-20` sessions per user). | Retained for 2 years. |
| `user_analytics` | High-volume operational event logs, AI token usage metrics, system latency, and conversion funnel analytics. | Append-only high volume (`~50M` events/month). | Automatic 90-day purging via MongoDB TTL Index (`expireAfterSeconds: 7776000`). |

---

## 3. Field Definitions & Schema Specifications

### 3.1 Collection: `users`
Stores user profile credentials, access rights, subscription details, and notification toggles.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Auto-generated unique user identifier. |
| `email` | `String` | `EmailStr` | Yes | Unique | User primary email address (lowercase, trimmed). |
| `password_hash` | `String` | `str` | Yes | No | Argon2id password hash string. |
| `full_name` | `String` | `str` | Yes | Text | Candidate full display name. |
| `phone_number` | `String` | `Optional[str]` | No | No | CSFLE Encrypted phone number format `+1XXXXXXXXXX`. |
| `avatar_url` | `String` | `Optional[HttpUrl]` | No | No | HTTPS URL to user profile image stored in S3/GCS. |
| `subscription` | `Object` | `SubscriptionSchema`| Yes | No | Embedded subdocument tracking billing status. |
| `subscription.plan_tier`| `String` | `PlanTierEnum` | Yes | Compound | Enum: `free`, `pro`, `executive`. Default: `free`. |
| `subscription.status` | `String` | `SubStatusEnum` | Yes | Compound | Enum: `active`, `past_due`, `canceled`, `trialing`. |
| `subscription.current_period_end`| `ISODate`| `datetime` | Yes | No | UTC timestamp when current subscription billing period ends. |
| `ai_credits_remaining`| `Int32` | `int` | Yes | No | Monthly quota balance for AI operations. Default: `50`. |
| `preferences` | `Object` | `UserPreferences` | Yes | No | Embedded user notification & UI preferences. |
| `preferences.target_roles`| `Array[String]`| `List[str]` | Yes | No | Array of desired job titles (e.g. `["Senior Backend Engineer"]`). |
| `preferences.desired_min_salary`| `Decimal128`| `Decimal` | No | No | Minimum target annual compensation in USD. |
| `preferences.preferred_locations`| `Array[String]`| `List[str]`| Yes | No | Preferred cities or remote flag (`["Remote", "New York, NY"]`). |
| `is_verified` | `Boolean` | `bool` | Yes | No | Email verification status flag. Default: `false`. |
| `created_at` | `ISODate` | `datetime` | Yes | Index | UTC timestamp when account was created. |
| `updated_at` | `ISODate` | `datetime` | Yes | No | UTC timestamp of last user record modification. |

---

### 3.2 Collection: `resumes`
Stores candidate master resumes with structured components and semantic profile vector embeddings.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Auto-generated unique resume identifier. |
| `user_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Foreign key reference to `users._id`. |
| `title` | `String` | `str` | Yes | No | User label for resume (e.g. "Master Systems Software Resume"). |
| `is_default` | `Boolean` | `bool` | Yes | Compound | Indicates if this is the primary resume for auto-matching. Default: `false`. |
| `contact_info` | `Object` | `ContactInfoSchema`| Yes | No | Candidate contact subdocument (CSFLE protected fields). |
| `contact_info.email` | `String` | `EmailStr` | Yes | No | Professional contact email. |
| `contact_info.phone` | `String` | `Optional[str]` | No | No | CSFLE Encrypted phone number. |
| `contact_info.linkedin_url`| `String` | `Optional[HttpUrl]`| No | No | LinkedIn profile URL. |
| `contact_info.github_url` | `String` | `Optional[HttpUrl]`| No | No | GitHub portfolio URL. |
| `summary` | `String` | `str` | Yes | Text | Professional executive summary statement. |
| `work_experience` | `Array[Object]`| `List[WorkExpSchema]`| Yes | No | Array of embedded work experience subdocuments. |
| `work_experience[].company`| `String`| `str` | Yes | Text | Employer company name. |
| `work_experience[].position`| `String`| `str` | Yes | Text | Job title held. |
| `work_experience[].start_date`| `ISODate`| `datetime` | Yes | No | Start date of employment. |
| `work_experience[].end_date`| `ISODate` | `Optional[datetime]`| No | No | End date of employment (null if currently employed). |
| `work_experience[].is_current`| `Boolean`| `bool` | Yes | No | Indicates active position status. Default: `false`. |
| `work_experience[].bullet_points`| `Array[String]`| `List[str]`| Yes | No | Accomplishment achievement statements. |
| `education` | `Array[Object]`| `List[EduSchema]` | Yes | No | Array of academic qualifications. |
| `skills` | `Array[Object]`| `List[SkillSchema]`| Yes | Index | Categorized technical and soft skills. |
| `skills[].name` | `String` | `str` | Yes | Index | Skill keyword (e.g. `FastAPI`, `MongoDB`, `Kubernetes`). |
| `skills[].category` | `String` | `SkillCategoryEnum`| Yes | No | Enum: `technical`, `framework`, `tool`, `soft_skill`, `language`. |
| `skills[].years_experience`| `Int32`| `int` | No | No | Total years of experience with skill. |
| `projects` | `Array[Object]`| `List[ProjectSchema]`| No | No | Open-source or portfolio projects. |
| `certifications` | `Array[Object]`| `List[CertSchema]` | No | No | Professional certifications (e.g. AWS Solutions Architect). |
| `embedding_vector` | `Array[Double]`| `List[float]` | Yes | Vector | 1536-dimensional OpenAI `text-embedding-3-small` vector. |
| `created_at` | `ISODate` | `datetime` | Yes | No | UTC creation timestamp. |
| `updated_at` | `ISODate` | `datetime` | Yes | Index | UTC last updated timestamp. |

---

### 3.3 Collection: `job_postings`
Aggregated job postings ingested from multiple job boards, web scrapers, and recruiter direct submissions.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Auto-generated unique job posting ID. |
| `external_id` | `String` | `str` | Yes | Unique | Deterministic hash/ID from source platform (`linkedin_839210`). |
| `source_platform` | `String` | `SourceEnum` | Yes | Compound | Enum: `linkedin`, `indeed`, `greenhouse`, `lever`, `custom`. |
| `title` | `String` | `str` | Yes | Text/Atlas | Official job title (e.g., "Senior Python Backend Engineer"). |
| `company_name` | `String` | `str` | Yes | Text/Atlas | Hiring organization name. |
| `company_logo_url`| `String` | `Optional[HttpUrl]`| No | No | HTTPS link to official company logo graphic. |
| `location` | `Object` | `LocationSchema` | Yes | Compound | Structured geographical location subdocument. |
| `location.city` | `String` | `str` | No | Compound | City name. |
| `location.state` | `String` | `str` | No | Compound | State / Province code. |
| `location.country` | `String` | `str` | Yes | Compound | ISO-2 Country code (e.g., `US`). |
| `location.is_remote` | `Boolean` | `bool` | Yes | Compound | Remote work availability flag. Default: `false`. |
| `salary_range` | `Object` | `SalaryRangeSchema`| No | No | Compensation specification subdocument. |
| `salary_range.min_amount`| `Decimal128`| `Optional[Decimal]`| No | No | Minimum base compensation. |
| `salary_range.max_amount`| `Decimal128`| `Optional[Decimal]`| No | No | Maximum base compensation. |
| `salary_range.currency` | `String` | `str` | Yes | No | ISO-3 Currency code (e.g., `USD`). Default: `USD`. |
| `salary_range.pay_period`| `String` | `PayPeriodEnum` | Yes | No | Enum: `hourly`, `monthly`, `yearly`. Default: `yearly`. |
| `description_raw` | `String` | `str` | Yes | No | Raw HTML / Markdown description text as ingested. |
| `description_clean`| `String` | `str` | Yes | Text/Atlas | Clean plain text normalized description. |
| `parsed_skills` | `Array[String]`| `List[str]` | Yes | Index | Extracted required skills array (`["FastAPI", "Docker"]`). |
| `experience_level` | `String` | `ExpLevelEnum` | Yes | Compound | Enum: `entry`, `mid`, `senior`, `lead`, `executive`. |
| `employment_type` | `String` | `EmpTypeEnum` | Yes | No | Enum: `full_time`, `part_time`, `contract`, `internship`. |
| `status` | `String` | `JobStatusEnum` | Yes | Compound | Enum: `active`, `expired`, `filled`, `archived`. Default: `active`. |
| `embedding_vector` | `Array[Double]`| `List[float]` | Yes | Vector | 1536-dimensional float vector representation. |
| `posted_at` | `ISODate` | `datetime` | Yes | Index | UTC timestamp when original listing was published. |
| `scraped_at` | `ISODate` | `datetime` | Yes | No | UTC timestamp when JobPilot ingested the listing. |

---

### 3.4 Collection: `applications`
Tracks job seeker application lifecycles, statuses, interview dates, recruiter notes, and denormalized job snapshots.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Auto-generated application tracking ID. |
| `user_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Foreign key reference to `users._id`. |
| `job_posting_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Foreign key reference to `job_postings._id`. |
| `tailored_resume_id`| `ObjectId` | `Optional[PyObjectId]`| No| No | Foreign key reference to `tailored_resumes._id`. |
| `cover_letter_id` | `ObjectId` | `Optional[PyObjectId]`| No| No | Foreign key reference to `cover_letters._id`. |
| `status` | `String` | `AppStatusEnum` | Yes | Compound | Enum: `bookmarked`, `applied`, `screening`, `technical_interview`, `offer_received`, `rejected`, `withdrawn`. |
| `job_snapshot` | `Object` | `JobSnapshotSchema` | Yes | No | **Denormalized snapshot** of job details at application time (eliminates lookup JOINs). |
| `job_snapshot.title` | `String` | `str` | Yes | No | Job title at application time. |
| `job_snapshot.company` | `String` | `str` | Yes | No | Company name at application time. |
| `job_snapshot.logo_url`| `String` | `Optional[str]` | No | No | Company logo URL. |
| `job_snapshot.location`| `String` | `str` | Yes | No | Location summary string. |
| `applied_at` | `ISODate` | `Optional[datetime]`| No | Index | UTC date when candidate formally submitted application. |
| `interview_dates` | `Array[ISODate]`| `List[datetime]`| Yes | No | Scheduled upcoming interview dates UTC. Default: `[]`. |
| `recruiter_info` | `Object` | `RecruiterSchema` | No | No | Primary recruiter or hiring manager contact details. |
| `notes` | `String` | `Optional[str]` | No | No | Personal markdown notes written by candidate. |
| `match_score` | `Double` | `float` | Yes | No | Algorithmic compatibility match score percentage (0.00 - 100.00). |
| `timeline_events` | `Array[Object]`| `List[EventSchema]` | Yes | No | Embedded audit trail array of status changes and notes. |
| `created_at` | `ISODate` | `datetime` | Yes | No | UTC record creation timestamp. |
| `updated_at` | `ISODate` | `datetime` | Yes | Index | UTC last modification timestamp. |

---

### 3.5 Collection: `tailored_resumes`
Stores AI-customized resume documents dynamically altered to maximize ATS keyword alignment for target job IDs.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Auto-generated tailored resume identifier. |
| `user_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Foreign key reference to `users._id`. |
| `master_resume_id`| `ObjectId` | `PyObjectId` | Yes | No | Foreign key reference to source `resumes._id`. |
| `job_posting_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Foreign key reference to target `job_postings._id`. |
| `ats_score_analysis`| `Object` | `ATSAnalysisSchema` | Yes | No | Detailed AI keyword match analysis subdocument. |
| `ats_score_analysis.overall_score`| `Int32`| `int` | Yes | No | ATS suitability score (0 to 100). |
| `ats_score_analysis.matched_keywords`| `Array[String]`| `List[str]`| Yes| No| List of successfully matched job description keywords. |
| `ats_score_analysis.missing_keywords`| `Array[String]`| `List[str]`| Yes| No| List of critical keywords missing from master resume. |
| `tailored_summary`| `String` | `str` | Yes | No | AI customized professional summary. |
| `tailored_experiences`| `Array[Object]`| `List[TailoredExpSchema]`| Yes| No| Modified work experience entries with optimized bullet points. |
| `pdf_export_url` | `String` | `Optional[HttpUrl]`| No | No | Presigned S3/GCS download link for generated PDF artifact. |
| `ai_model_used` | `String` | `str` | Yes | No | Name of LLM model used (e.g. `gemini-1.5-pro`, `gpt-4o`). |
| `created_at` | `ISODate` | `datetime` | Yes | Index | UTC timestamp when document was generated. |

---

### 3.6 Collection: `cover_letters`
Stores AI generated cover letters with customized tone parameters, job target mappings, and edit revisions.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Unique cover letter identifier. |
| `user_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Reference to `users._id`. |
| `job_posting_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Reference to target `job_postings._id`. |
| `title` | `String` | `str` | Yes | No | Document title (e.g., "Cover Letter - OpenAI Backend Engineer"). |
| `content` | `String` | `str` | Yes | Text | Markdown formatted cover letter text body. |
| `tone_setting` | `String` | `ToneEnum` | Yes | No | Enum: `professional`, `enthusiastic`, `executive`, `bold`. Default: `professional`. |
| `custom_instructions`| `String` | `Optional[str]` | No | No | Specific user prompt guidance provided to AI generator. |
| `version` | `Int32` | `int` | Yes | No | Incremental revision version integer. Default: `1`. |
| `created_at` | `ISODate` | `datetime` | Yes | No | UTC timestamp of initial generation. |
| `updated_at` | `ISODate` | `datetime` | Yes | No | UTC timestamp of last edit. |

---

### 3.7 Collection: `interview_prep`
Stores AI-guided mock interview sessions, dynamic questions, audio transcripts, and STAR method evaluations.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Unique interview session ID. |
| `user_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Reference to `users._id`. |
| `job_posting_id` | `ObjectId` | `PyObjectId` | Yes | No | Reference to target `job_postings._id`. |
| `session_type` | `String` | `PrepTypeEnum` | Yes | No | Enum: `behavioral`, `system_design`, `technical_coding`, `culture_fit`. |
| `questions` | `Array[Object]`| `List[QuestionSchema]`| Yes | No | List of generated questions, candidate responses, and AI feedback. |
| `questions[].q_id` | `String` | `str` | Yes | No | Unique question identifier within session. |
| `questions[].question_text`| `String`| `str` | Yes | No | Interrogatory text generated by AI interviewer. |
| `questions[].user_response_text`| `String`| `Optional[str]`| No| No | Transcribed or typed response from candidate. |
| `questions[].star_score`| `Object` | `STARScoreSchema` | No | No | Evaluation of Situation, Task, Action, Result components. |
| `questions[].feedback_summary`| `String`| `Optional[str]`| No| No | Critique and actionable improvement recommendations. |
| `overall_performance_score`| `Int32`| `Optional[int]` | No | No | Composite session score (0-100). |
| `created_at` | `ISODate` | `datetime` | Yes | Index | Session initiation UTC timestamp. |

---

### 3.8 Collection: `user_analytics`
High-throughput time-series event log tracking user telemetry, AI token costs, conversion funnels, and system latencies.

| Field Name | BSON Data Type | Pydantic Type | Required | Indexed | Description & Default Values |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | `PyObjectId` | Yes | Primary | Event record ID. |
| `user_id` | `ObjectId` | `PyObjectId` | Yes | Compound | Reference to `users._id`. |
| `event_type` | `String` | `EventTypeEnum` | Yes | Compound | Enum: `ai_resume_tailored`, `job_searched`, `application_status_changed`, `mock_interview_completed`. |
| `metadata` | `Object` | `Dict[str, Any]` | Yes | No | Arbitrary JSON event payload metadata (e.g. latency_ms, tokens_used). |
| `ai_tokens_consumed`| `Int32` | `int` | Yes | No | Total LLM tokens expended for operation. Default: `0`. |
| `cost_usd` | `Decimal128` | `Decimal` | Yes | No | Financial API execution cost in USD. Default: `0.000000`. |
| `created_at` | `ISODate` | `datetime` | Yes | TTL | **TTL Indexed UTC timestamp** (`expireAfterSeconds: 7776000` = 90 days). |

---

## 4. Data Types & BSON Specifications

MongoDB Atlas uses **BSON (Binary JSON)** data types. To guarantee strict type safety across FastAPI and PyMongo, explicit mappings are established:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   BSON Data Type Mapping Architecture                  │
├───────────────────┬──────────────────────────┬─────────────────────────┤
│ BSON Type         │ Python / Pydantic v2 Type│ TypeScript Client Type  │
├───────────────────┼──────────────────────────┼─────────────────────────┤
│ ObjectId          │ pydantic.ObjectId        │ string (24-char hex)    │
│ String            │ str                      │ string                  │
│ Int32             │ int                      │ number                  │
│ Int64             │ int                      │ number                  │
│ Double            │ float                    │ number                  │
│ Decimal128        │ decimal.Decimal          │ string / number         │
│ Boolean           │ bool                     │ boolean                 │
│ ISODate           │ datetime.datetime (UTC)  │ string (ISO 8601 UTC)   │
│ Array             │ typing.List[T]           │ Array<T>                │
│ Embedded Document │ pydantic.BaseModel       │ Interface / Object      │
│ BinData (Vector)  │ typing.List[float]       │ Array<number> (len=1536)│
└───────────────────┴──────────────────────────┴─────────────────────────┘
```

### Critical Data Type Decisions

1. **`Decimal128` for Monetary & Cost Fields:**
   * **RATIONALE:** Standard double-precision floating point types (`Double`) suffer from IEEE 754 binary rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). Salary ranges and AI token execution costs are stored using `BSON Decimal128` to guarantee exact decimal financial calculations.
2. **`ISODate` for All Timestamps:**
   * **RATIONALE:** Timestamps are stored exclusively as native BSON `ISODate` objects forced to UTC (`tz=timezone.utc`). Epoch integers or local timezone strings are forbidden to prevent ambiguous query filtering across regions.
3. **`Array[Double]` with Fixed Dimension (1536) for Embeddings:**
   * **RATIONALE:** Vectors generated by OpenAI `text-embedding-3-small` or Gemini `text-embedding-004` are stored as dense float arrays. This matches MongoDB Atlas Vector Search `knnVector` index requirements.

---

## 5. JSON Schema Validation Rules (`$jsonSchema`)

Database-level invariants are enforced at the MongoDB storage engine tier using `$jsonSchema` validators. This guarantees that corrupted payloads are rejected even if backend validation is bypassed.

### 5.1 MongoDB Collection Validator Script: `users`

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "email", "password_hash", "full_name", "subscription", "ai_credits_remaining", "is_verified", "created_at", "updated_at"],
      properties: {
        _id: { bsonType: "objectId" },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
          description: "Must be a valid email address string"
        },
        password_hash: {
          bsonType: "string",
          minLength: 30,
          description: "Argon2id or bcrypt hash string"
        },
        full_name: {
          bsonType: "string",
          minLength: 2,
          maxLength: 100
        },
        subscription: {
          bsonType: "object",
          required: ["plan_tier", "status", "current_period_end"],
          properties: {
            plan_tier: {
              enum: ["free", "pro", "executive"],
              description: "Must be a valid subscription plan tier"
            },
            status: {
              enum: ["active", "past_due", "canceled", "trialing"]
            },
            current_period_end: { bsonType: "date" }
          }
        },
        ai_credits_remaining: {
          bsonType: "int",
          minimum: 0,
          description: "Credits balance cannot be negative"
        },
        is_verified: { bsonType: "bool" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

### 5.2 MongoDB Collection Validator Script: `job_postings`

```javascript
db.createCollection("job_postings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "external_id", "source_platform", "title", "company_name", "location", "description_clean", "experience_level", "status", "embedding_vector", "posted_at"],
      properties: {
        _id: { bsonType: "objectId" },
        external_id: { bsonType: "string" },
        source_platform: {
          enum: ["linkedin", "indeed", "greenhouse", "lever", "custom"]
        },
        title: { bsonType: "string", minLength: 2 },
        company_name: { bsonType: "string", minLength: 1 },
        location: {
          bsonType: "object",
          required: ["country", "is_remote"],
          properties: {
            city: { bsonType: "string" },
            state: { bsonType: "string" },
            country: { bsonType: "string", minLength: 2, maxLength: 2 },
            is_remote: { bsonType: "bool" }
          }
        },
        salary_range: {
          bsonType: "object",
          required: ["currency", "pay_period"],
          properties: {
            min_amount: { bsonType: "decimal" },
            max_amount: { bsonType: "decimal" },
            currency: { bsonType: "string", minLength: 3, maxLength: 3 },
            pay_period: { enum: ["hourly", "monthly", "yearly"] }
          }
        },
        experience_level: {
          enum: ["entry", "mid", "senior", "lead", "executive"]
        },
        status: {
          enum: ["active", "expired", "filled", "archived"]
        },
        embedding_vector: {
          bsonType: "array",
          minItems: 1536,
          maxItems: 1536,
          items: { bsonType: "double" },
          description: "Must be a 1536-dimensional array of float values"
        },
        posted_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});
```

---

## 6. Data Relationships & Embedding Patterns

### 6.1 Embedding vs. Referencing Design Decision Matrix

To achieve optimal read performance without hitting WiredTiger document size limits (16 MB), JobPilot AI follows strict schema design patterns:

```
   EMBED IF:                               REFERENCE IF:
 ┌──────────────────────────┐            ┌──────────────────────────┐
 │ - Data accessed together │            │ - Unbounded 1:N growth   │
 │   90%+ of queries        │            │   (e.g. >10,000 subdocs) │
 │ - Bounded array size     │     VS     │ - Standalone entity with │
 │   (e.g. <50 items)       │            │   independent lifecycle  │
 │ - Atomic updates required│            │ - High duplication risk  │
 └──────────────────────────┘            └──────────────────────────┘
```

| Relationship | Design Pattern | Schema Implementation | Technical Justification |
| :--- | :--- | :--- | :--- |
| **`users` ➔ `resumes`** | **Referenced (1:N)** | `resumes.user_id ➔ users._id` | Resumes contain large arrays of experiences and 1536-dim vector embeddings. Embedding multiple resumes in `users` would cause document bloat and exceed memory limits during authentication queries. |
| **`resumes` ➔ `work_experience`**| **Embedded (1:N Bounded)**| `resumes.work_experience: [...]` | Candidates rarely have > 30 career experiences. Accessing a resume *always* requires fetching work experience. Embedding guarantees a single disk read. |
| **`applications` ➔ `job_postings`**| **Hybrid Snapshot + Referenced**| `applications.job_posting_id` + `applications.job_snapshot` | **HYBRID PATTERN:** Referencing `job_posting_id` allows full relational joins if needed, while embedding a `job_snapshot` (`title`, `company`, `logo`) allows rendering the Kanban application pipeline board in **1 query with 0 JOINs**. |
| **`applications` ➔ `timeline_events`**| **Embedded (1:N Audit Log)**| `applications.timeline_events: [...]` | Event history for a job application is bounded (< 50 status changes). Storing in-document provides atomic historical context. |

---

## 7. Indexing Strategy & Atlas Vector Search Specs

### 7.1 Secondary & Compound Indexes Specification

Indexes are explicitly defined to support common FastAPI query filters and sort patterns.

```javascript
// 1. UNIQUE INDEXES
db.users.createIndex({ "email": 1 }, { unique: true, name: "idx_users_email_unique" });
db.job_postings.createIndex({ "external_id": 1 }, { unique: true, name: "idx_job_postings_ext_id_unique" });

// 2. COMPOUND INDEXES (Following the ESR Rule: Equality, Sort, Range)
// Supports user application dashboard filtered by status and sorted by last update
db.applications.createIndex(
  { "user_id": 1, "status": 1, "updated_at": -1 },
  { name: "idx_applications_user_status_updated" }
);

// Supports job search filtering by active status, remote flag, and posting recency
db.job_postings.createIndex(
  { "status": 1, "location.is_remote": 1, "posted_at": -1 },
  { name: "idx_job_postings_status_remote_posted" }
);

// 3. PARTIAL INDEXES (Optimizes index size by indexing active records only)
db.applications.createIndex(
  { "user_id": 1, "status": 1 },
  { 
    name: "idx_applications_active_only",
    partialFilterExpression: { status: { $in: ["applied", "screening", "technical_interview", "offer_received"] } }
  }
);

// 4. TTL INDEXES (Automatic document purging for event logs)
db.user_analytics.createIndex(
  { "created_at": 1 },
  { expireAfterSeconds: 7776000, name: "idx_user_analytics_ttl_90d" } // 90 days
);
```

### 7.2 MongoDB Atlas Search (Apache Lucene Text Search)
Created on `job_postings` for full-text keyword search across raw job descriptions.

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.standard" },
      "company_name": { "type": "string", "analyzer": "lucene.standard" },
      "description_clean": { "type": "string", "analyzer": "lucene.english" },
      "parsed_skills": { "type": "string", "analyzer": "lucene.keyword" }
    }
  }
}
```

### 7.3 Atlas Vector Search Index Specification
Atlas Vector Search utilizes Hierarchical Navigable Small World (**HNSW**) graphs for sub-second Approximate Nearest Neighbor (ANN) search over 1536-dimensional embeddings.

```json
{
  "fields": [
    {
      "numDimensions": 1536,
      "path": "embedding_vector",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "status",
      "type": "filter"
    },
    {
      "path": "location.is_remote",
      "type": "filter"
    },
    {
      "path": "experience_level",
      "type": "filter"
    }
  ]
}
```

---

## 8. Security, Privacy & Encryption (CSFLE)

### 8.1 Client-Side Field Level Encryption (CSFLE)
To comply with GDPR, CCPA, and SOC2 Type II standards, highly sensitive Candidate Personally Identifiable Information (**PII**) is encrypted **on the FastAPI application client before traversing the network to MongoDB Atlas**.

* **KMS Key Management Provider:** AWS KMS / GCP KMS Key Management Service.
* **Encrypted Fields in `resumes` and `users`:**
  * `users.phone_number`
  * `resumes.contact_info.phone`
  * `resumes.contact_info.street_address`
* **Encryption Algorithm:** `AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic` (allows exact match equality queries on encrypted phone numbers without decrypting the entire database).

### 8.2 Database Role-Based Access Control (RBAC)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MongoDB Atlas RBAC Roles                        │
├─────────────────┬──────────────────────┬───────────────────────────────┤
│ Role Name       │ Granted Privileges   │ Assigned Service Component    │
├─────────────────┼──────────────────────┼───────────────────────────────┤
│ `jobpilot_app`  │ `readWrite` on       │ FastAPI Core Backend API      │
│                 │ operational DB       │                               │
├─────────────────┼──────────────────────┼───────────────────────────────┤
│ `jobpilot_ingest│ `readWrite` on       │ Nocturnal Job Aggregator Bot  │
│                 │ `job_postings` only  │                               │
├─────────────────┼──────────────────────┼───────────────────────────────┤
│ `jobpilot_bi`   │ `read` on            │ Metabase / Analytical BI Tool │
│                 │ `user_analytics`     │                               │
└─────────────────┴──────────────────────┴───────────────────────────────┘
```

---

## 9. Query Optimization & FastAPI Motor Patterns

### 9.1 FastAPI Async Motor Integration
The backend uses **Motor** (the official async driver for MongoDB) paired with **Pydantic v2** for async IO non-blocking query execution.

#### Pattern 1: Atlas Vector Search with Pre-Filtering (Semantic Job Match)

```python
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List

async def match_jobs_for_candidate(
    db_client: AsyncIOMotorClient,
    candidate_vector: List[float],
    is_remote_only: bool = True,
    limit: int = 10
):
    """
    Executes a high-performance vector search with pre-filtering
    to match jobs against candidate resume vectors.
    """
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index_job_postings",
                "path": "embedding_vector",
                "queryVector": candidate_vector,
                "numCandidates": limit * 20,
                "limit": limit,
                "filter": {
                    "$and": [
                        {"status": {"$eq": "active"}},
                        {"location.is_remote": {"$eq": is_remote_only}}
                    ]
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "title": 1,
                "company_name": 1,
                "location": 1,
                "salary_range": 1,
                "parsed_skills": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    
    cursor = db_client.jobpilot.job_postings.aggregate(pipeline)
    return await cursor.to_list(length=limit)
```

#### Pattern 2: Multi-Document ACID Transaction (Apply to Job)

```python
from bson import ObjectId
from datetime import datetime, timezone

async def execute_job_application_transaction(
    client: AsyncIOMotorClient,
    user_id: str,
    job_id: str,
    tailored_resume_id: str,
    job_snapshot: dict
):
    """
    Executes an atomic ACID multi-document transaction across 3 collections.
    """
    async with await client.start_session() as session:
        async with session.start_transaction():
            db = client.jobpilot
            
            # 1. Deduct AI credits
            user_update = await db.users.update_one(
                {"_id": ObjectId(user_id), "ai_credits_remaining": {"$gte": 1}},
                {"$inc": {"ai_credits_remaining": -1}},
                session=session
            )
            if user_update.modified_count == 0:
                raise ValueError("Insufficient AI credits balance")
                
            # 2. Insert Application Tracking Document
            app_doc = {
                "user_id": ObjectId(user_id),
                "job_posting_id": ObjectId(job_id),
                "tailored_resume_id": ObjectId(tailored_resume_id),
                "status": "applied",
                "job_snapshot": job_snapshot,
                "applied_at": datetime.now(timezone.utc),
                "interview_dates": [],
                "match_score": 94.5,
                "timeline_events": [
                    {
                        "event_type": "status_change",
                        "from_status": None,
                        "to_status": "applied",
                        "timestamp": datetime.now(timezone.utc),
                        "note": "Application submitted via JobPilot AutoPilot"
                    }
                ],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.applications.insert_one(app_doc, session=session)
```

---

## 10. Scalability & Sharding Strategy

### 10.1 MongoDB Sharding Configuration
When primary storage exceeds 1 TB, collections will be partitioned across shards using **Hashed Shard Keys** to eliminate write hot-spotting.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Sharding Architecture Distribution                   │
├───────────────────┬────────────────────────────┬───────────────────────┤
│ Collection        │ Selected Shard Key         │ Distribution Rationale│
├───────────────────┼────────────────────────────┼───────────────────────┤
│ `resumes`         │ `{ "user_id": "hashed" }`  │ Evenly distributes    │
│ `applications`    │ `{ "user_id": "hashed" }`  │ user data across all  │
│ `tailored_resumes`│ `{ "user_id": "hashed" }`  │ shards; routes queries │
│ `cover_letters`   │ `{ "user_id": "hashed" }`  │ to a single shard.    │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ `job_postings`    │ `{ "location.country": 1,  │ Ranged sharding by    │
│                   │   "_id": "hashed" }`       │ country allows geo-    │
│                   │                            │ localized job searches│
└───────────────────┴────────────────────────────┴───────────────────────┘
```

### 10.2 Connection Pooling Setup (FastAPI Motor)

```python
# FastAPI App Initialization
motor_client = AsyncIOMotorClient(
    MONGODB_ATLAS_URI,
    maxPoolSize=100,      # Max open connections per worker process
    minPoolSize=10,       # Warm pre-allocated pool
    maxIdleTimeMS=45000,  # Recycles stale idle connections
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000
)
```

---

## 11. Future Collections & System Roadmap

To support upcoming candidate CRM capabilities, 4 expansion collections are scheduled for Release v3.0:

1. **`recruiter_contacts`**: Personal CRM tracking recruiter emails, phone numbers, company associations, response latency, and personal relationship notes.
2. **`company_insights`**: Aggregated crowd-sourced & AI parsed intelligence regarding hiring process difficulty, interview stages, remote culture, and salary negotiation bands.
3. **`ai_prompt_telemetry`**: Deep monitoring logs evaluating LLM prompt versions, temperature settings, token latency, output hallucinatory index, and cost per tailored artifact.
4. **`networking_outreach`**: Automated cold email & LinkedIn InMail sequence tracking with open rates, response rates, and follow-up automated reminders.

---

## 12. Complete Production Sample Documents

### 12.1 Collection: `users`
```json
{
  "_id": { "$oid": "66a8f1e2b4c9d1001a8f3001" },
  "email": "alex.chen.tech@gmail.com",
  "password_hash": "$argon2id$v=19$m=65536,t=3,p=4$Z3R4Szh2TnI5YW01$Qx9m7V2p3R8sT1uV4wX7yZ0aB1cC2dE3fG4hI5jK6lM",
  "full_name": "Alex Chen",
  "phone_number": "+14155550192",
  "avatar_url": "https://assets.jobpilot.ai/avatars/66a8f1e2b4c9d1001a8f3001.png",
  "subscription": {
    "plan_tier": "pro",
    "status": "active",
    "current_period_end": { "$date": "2026-08-15T00:00:00.000Z" }
  },
  "ai_credits_remaining": 450,
  "preferences": {
    "target_roles": [
      "Senior Backend Engineer",
      "Lead Systems Architect"
    ],
    "desired_min_salary": { "$numberDecimal": "185000.00" },
    "preferred_locations": [
      "Remote",
      "San Francisco, CA",
      "New York, NY"
    ]
  },
  "is_verified": true,
  "created_at": { "$date": "2026-01-10T08:30:00.000Z" },
  "updated_at": { "$date": "2026-07-28T14:22:10.000Z" }
}
```

### 12.2 Collection: `resumes`
```json
{
  "_id": { "$oid": "66a8f2a4b4c9d1001a8f3002" },
  "user_id": { "$oid": "66a8f1e2b4c9d1001a8f3001" },
  "title": "Master Backend Systems Resume 2026",
  "is_default": true,
  "contact_info": {
    "email": "alex.chen.tech@gmail.com",
    "phone": "+14155550192",
    "linkedin_url": "https://linkedin.com/in/alexchen-dev",
    "github_url": "https://github.com/alexchen-dev"
  },
  "summary": "Senior Distributed Systems Engineer with 8+ years of experience designing high-throughput microservices using Python (FastAPI), Go, and MongoDB Atlas. Specialized in event-driven architectures and LLM application integration.",
  "work_experience": [
    {
      "company": "Datastream Tech",
      "position": "Senior Backend Engineer",
      "start_date": { "$date": "2022-03-01T00:00:00.000Z" },
      "end_date": null,
      "is_current": true,
      "bullet_points": [
        "Architected async event ingestion pipeline handling 45,000 requests/sec using FastAPI, Kafka, and MongoDB, reducing p99 latency by 42%.",
        "Pioneered vector search implementation using MongoDB Atlas Vector Search, improving candidate matching precision by 35%."
      ]
    }
  ],
  "education": [
    {
      "institution": "University of California, Berkeley",
      "degree": "B.S. Computer Science",
      "graduation_year": 2018
    }
  ],
  "skills": [
    { "name": "FastAPI", "category": "framework", "years_experience": 5 },
    { "name": "MongoDB", "category": "technical", "years_experience": 7 },
    { "name": "Python", "category": "technical", "years_experience": 8 },
    { "name": "Docker", "category": "tool", "years_experience": 6 }
  ],
  "projects": [],
  "certifications": [],
  "embedding_vector": [
    0.0124, -0.0451, 0.0892, 0.0031, -0.0215, 0.0512, 0.0318, -0.0119,
    0.0671, -0.0384, 0.0192, 0.0441, -0.0091, 0.0283, 0.0152, -0.0521
  ],
  "created_at": { "$date": "2026-01-10T09:00:00.000Z" },
  "updated_at": { "$date": "2026-07-20T11:15:00.000Z" }
}
```

### 12.3 Collection: `job_postings`
```json
{
  "_id": { "$oid": "66a8f3f8b4c9d1001a8f3003" },
  "external_id": "linkedin_402918203",
  "source_platform": "linkedin",
  "title": "Senior Python Infrastructure Engineer",
  "company_name": "CloudScale AI",
  "company_logo_url": "https://assets.jobpilot.ai/logos/cloudscale.png",
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "is_remote": true
  },
  "salary_range": {
    "min_amount": { "$numberDecimal": "190000.00" },
    "max_amount": { "$numberDecimal": "230000.00" },
    "currency": "USD",
    "pay_period": "yearly"
  },
  "description_raw": "<p>CloudScale AI is seeking a Senior Python Engineer to build async data infrastructure...</p>",
  "description_clean": "CloudScale AI is seeking a Senior Python Engineer to build async data infrastructure supporting high-scale LLM workflows. Must have deep expertise in FastAPI, PyMongo, and distributed systems.",
  "parsed_skills": ["Python", "FastAPI", "MongoDB", "AsyncIO", "Redis"],
  "experience_level": "senior",
  "status": "active",
  "embedding_vector": [
    0.0119, -0.0428, 0.0881, 0.0029, -0.0201, 0.0498, 0.0305, -0.0102,
    0.0655, -0.0371, 0.0185, 0.0429, -0.0085, 0.0271, 0.0148, -0.0503
  ],
  "posted_at": { "$date": "2026-07-29T10:00:00.000Z" },
  "scraped_at": { "$date": "2026-07-29T10:15:22.000Z" }
}
```

### 12.4 Collection: `applications`
```json
{
  "_id": { "$oid": "66a8f512b4c9d1001a8f3004" },
  "user_id": { "$oid": "66a8f1e2b4c9d1001a8f3001" },
  "job_posting_id": { "$oid": "66a8f3f8b4c9d1001a8f3003" },
  "tailored_resume_id": { "$oid": "66a8f600b4c9d1001a8f3005" },
  "cover_letter_id": { "$oid": "66a8f700b4c9d1001a8f3006" },
  "status": "technical_interview",
  "job_snapshot": {
    "title": "Senior Python Infrastructure Engineer",
    "company": "CloudScale AI",
    "logo_url": "https://assets.jobpilot.ai/logos/cloudscale.png",
    "location": "San Francisco, CA (Remote)"
  },
  "applied_at": { "$date": "2026-07-29T11:00:00.000Z" },
  "interview_dates": [
    { "$date": "2026-08-03T18:00:00.000Z" }
  ],
  "recruiter_info": {
    "name": "Sarah Jenkins",
    "email": "s.jenkins@cloudscale.ai",
    "title": "Senior Tech Recruiter"
  },
  "notes": "Spoke with Sarah during screening. Hiring manager is VP of Infra. System design round will focus on async queue handling.",
  "match_score": 96.2,
  "timeline_events": [
    {
      "event_type": "status_change",
      "from_status": null,
      "to_status": "applied",
      "timestamp": { "$date": "2026-07-29T11:00:00.000Z" },
      "note": "Submitted application via JobPilot AutoPilot"
    },
    {
      "event_type": "status_change",
      "from_status": "applied",
      "to_status": "technical_interview",
      "timestamp": { "$date": "2026-07-31T09:30:00.000Z" },
      "note": "Passed recruiter screen, scheduled technical deep dive"
    }
  ],
  "created_at": { "$date": "2026-07-29T10:45:00.000Z" },
  "updated_at": { "$date": "2026-07-31T09:30:00.000Z" }
}
```

---

## 13. Naming & Structural Conventions

To maintain strict developer consistency across FastAPI models and frontend interfaces:

1. **Collection Names:** Plural, lowercase `snake_case` (e.g. `users`, `job_postings`, `tailored_resumes`).
2. **Field Names:** Lowercase `snake_case` matching Python conventions (e.g. `master_resume_id`, `created_at`).
3. **Primary / Foreign Keys:** Primary keys must use default `_id` (`ObjectId`). Foreign keys must be suffix-named `<entity>_id` (e.g. `user_id`, `job_posting_id`).
4. **Enum Strings:** Lowercase `snake_case` strings (e.g. `technical_interview`, `senior`, `full_time`).
5. **Timestamp Fields:** Append `_at` for dates (e.g. `created_at`, `posted_at`, `applied_at`).
6. **Index Naming Standard:** `idx_<collection>_<field1>_<field2>_<type>` (e.g. `idx_applications_user_status_updated`).

---
*End of JobPilot AI Database Architecture Specification — Version 2.4.0-PROD*
