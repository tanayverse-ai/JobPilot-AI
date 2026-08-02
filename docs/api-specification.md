\# JobPilot AI: Backend API Specification (v1.0.0)
 
This document defines the RESTful API standards and endpoint specifications for the JobPilot AI platform. As a production-grade system, this API follows the **REST architectural style**, utilizing JSON for data interchange and JWT for stateless authentication.
 
\---
 
\## 1. API Standards & Architecture
 
\### 1.1 Base URL
 
\*Production:\*\* `https://api.jobpilot-ai.com/v1`
 
\*Staging:\*\* `https://staging-api.jobpilot-ai.com/v1`
 
\*Development:\*\* `http://localhost:8080/v1`
 
\### 1.2 Communication Protocol
 
\*Protocol:\*\* HTTPS only. All non-TLS requests will be rejected with a `403 Forbidden`.
 
\*Content-Type:\*\* `application/json` (except for file uploads using `multipart/form-data`).
 
\*Encoding:\*\* UTF-8.
 
\### 1.3 Versioning
 
The API uses URI versioning (\`/v1/\`). Major changes will increment the version number. Deprecated versions will be supported for 6 months after a new version release.
 
\### 1.4 Request Headers
 
| Header | Requirement | Description |
 
| :--- | :--- | :--- |
 
| `Authorization` | Required (Protected) | Bearer JWT token. |
 
| `Content-Type` | Required | Must be `application/json`. |
 
| `X-Request-ID` | Recommended | UUID for distributed tracing and logging. |
 
| `Accept-Language` | Optional | For localized error messages (default: `en`). |
 
\---
 
\## 2. Authentication & Authorization
 
\### 2.1 Strategy
 
JobPilot AI utilizes **JWT (JSON Web Tokens)** for stateless authentication.
 
\*Access Token:\*\* Short-lived (15 minutes).
 
\*Refresh Token:\*\* Long-lived (7 days), stored in an `HttpOnly`, `Secure` cookie.
 
\*Role-Based Access Control (RBAC):\*\* Permissions are validated at the middleware layer based on the `role` claim in the JWT.
 
\### 2.2 Token Rotation
 
To prevent replay attacks, the system implements Refresh Token Rotation. Every time a refresh token is used, a new pair is issued, and the old one is invalidated.
 
\---
 
\## 3. Global Formats
 
\### 3.1 Success Response
 
All success responses (except 204 No Content) return a standardized envelope.
 
\`\`\`json
 
{
 
"success": true,
 
"data": { ... },
 
"metadata": {
 
"requestId": "550e8400-e29b-41d4-a716-446655440000",
 
"timestamp": "2024-05-20T14:30:00Z"
 
}
 
}
 
\`\`\`
 
\### 3.2 Error Response
 
Standardized error format following RFC 7807 principles.
 
\`\`\`json
 
{
 
"success": false,
 
"error": {
 
"code": "VALIDATION\_FAILED",
 
"message": "The provided input is invalid.",
 
"details": \[
 
{
 
"field": "email",
 
"issue": "Must be a valid email address"
 
}
 
\]
 
},
 
"requestId": "550e8400-e29b-41d4-a716-446655440000"
 
}
 
\`\`\`
 
\### 3.3 Status Codes
 
\* `200 OK`: Request succeeded.
 
\* `201 Created`: Resource created.
 
\* `204 No Content`: Successful deletion or update with no return body.
 
\* `400 Bad Request`: Malformed syntax.
 
\* `401 Unauthorized`: Authentication failed/missing.
 
\* `403 Forbidden`: Authenticated but lacks permissions.
 
\* `404 Not Found`: Resource does not exist.
 
\* `422 Unprocessable Entity`: Validation errors.
 
\* `429 Too Many Requests`: Rate limit exceeded.
 
\* `500 Internal Server Error`: Critical failure.
 
\---
 
\## 4. Rate Limiting
 
To ensure high availability and prevent abuse:
 
\*Tier 1 (Free):\*\* 60 requests/minute.
 
\*Tier 2 (Pro):\*\* 500 requests/minute.
 
\*Auth Endpoints:\*\* 5 attempts/5 minutes per IP to prevent brute-force attacks.
 
\*Response Headers:\*\* `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
 
\---
 
\## 5. Endpoints
 
\### 5.1 Authentication Module
 
\#### `POST /auth/register`
 
Creates a new user account.
 
\*Body:\*\* `{ "email": "user@example.com", "password": "SecurePassword123!", "name": "John Doe" }`
 
\*Success (201):\*\* Returns user object and verification status.
 
\*Edge Case:\*\* If email exists, return `409 Conflict` to prevent account enumeration but notify the legitimate user.
 
\#### `POST /auth/login`
 
Authenticates user and returns tokens.
 
\*Body:\*\* `{ "email": "user@example.com", "password": "SecurePassword123!" }`
 
\*Success (200):\*\* Sets Refresh Token in cookie; returns Access Token in body.
 
\---
 
\### 5.2 User Management
 
\#### `GET /users/me`
 
Retrieves the current authenticated user's profile.
 
\*Headers:\*\* `Authorization: Bearer <token>`
 
\*Success (200):\*\* User profile, subscription status, and preferences.
 
\#### `PATCH /users/me`
 
Partial update of user profile.
 
\*Body:\*\* `{ "bio": "Senior Dev", "linkedInUrl": "..." }`
 
\*Justification:\*\* `PATCH` is used over `PUT` to allow partial updates without requiring the full object.
 
\---
 
\### 5.3 Application Tracking
 
\#### `GET /applications`
 
List all job applications with pagination and filtering.
 
\*Query Params:\*\* `page=1`, `limit=20`, `status=INTERVIEWING`, `search=Google`
 
\*Success (200):\*\* Paginated list of applications.
 
\#### `POST /applications`
 
Log a new job application.
 
\*Body:\*\* `{ "company": "Tech Corp", "role": "Frontend Engineer", "status": "APPLIED", "jobUrl": "..." }`
 
\*Success (201):\*\* The created application resource with its generated ID.
 
\---
 
\### 5.4 Resume Management
 
\#### `POST /resumes/upload`
 
Uploads a resume file for processing.
 
\*Content-Type:\*\* `multipart/form-data`
 
\*Body:\*\* `file: <PDF/DOCX>`
 
\*Success (201):\*\* File metadata and a `processing_status` (Queued).
 
\*Justification:\*\* Async processing is required because AI parsing takes 2-5 seconds.
 
\#### `GET /resumes/{id}/analysis`
 
Retrieves AI-parsed data and optimization suggestions.
 
\*Success (200):\*\* Returns keyword gaps, ATS compatibility score, and formatting tips.
 
\---
 
\### 5.5 AI Module (Core Intelligence)
 
\#### `POST /ai/match-score`
 
Compares a specific resume against a job description.
 
\*Body:\*\* `{ "resumeId": "uuid", "jobDescription": "Text content..." }`
 
\*Success (200):\*\* `{ "score": 85, "matchReason": "...", "missingKeywords": ["K8s", "GraphQL"] }`
 
\#### `POST /ai/generate-cover-letter`
 
Generates a tailored cover letter using LLM.
 
\*Body:\*\* `{ "resumeId": "uuid", "applicationId": "uuid", "tone": "professional" }`
 
\*Edge Case:\*\* Returns `402 Payment Required` if user has exhausted their monthly AI generation quota.
 
\---
 
\### 5.6 Interview Preparation
 
\#### `POST /interviews/practice/start`
 
Initializes a simulated AI interview session.
 
\*Body:\*\* `{ "role": "Backend Architect", "difficulty": "Senior" }`
 
\*Success (201):\*\* `{ "sessionId": "uuid", "firstQuestion": "..." }`
 
\#### `POST /interviews/practice/{id}/respond`
 
Submits a user's answer (text or transcript) for evaluation.
 
\*Body:\*\* `{ "answer": "My approach to microservices is..." }`
 
\*Success (200):\*\* Feedback on the specific answer and the next question.
 
\---
 
\### 5.7 Analytics
 
\#### `GET /analytics/dashboard`
 
Aggregated data for the user's dashboard.
 
\*Success (200):\*\*
 
\`\`\`json
 
{
 
"applicationsCount": 45,
 
"interviewConversionRate": "12%",
 
"weeklyActivity": \[ { "day": "Mon", "count": 3 }, ... \]
 
}
 
\`\`\`
 
\*Justification:\*\* Aggregated in a single call to minimize round-trips for the dashboard view.
 
\---
 
\### 5.8 Notifications
 
\#### `GET /notifications`
 
Retrieves user alerts (e.g., "Interview in 1 hour", "New AI match found").
 
\*Success (200):\*\* List of notification objects with `read_at` timestamps.
 
\#### `PATCH /notifications/mark-read`
 
Bulk mark notifications as read.
 
\*Body:\*\* `{ "ids": ["uuid1", "uuid2"] }`
 
\---
 
\### 5.9 Settings
 
\#### `GET /settings`
 
Retrieves system and user-specific configurations.
 
\*Data:\*\* Theme, email notification toggles, privacy visibility for recruiters.
 
\#### `PATCH /settings`
 
Updates specific configuration flags.
 
\---
 
\## 6. Implementation Notes & Assumptions
 
\### 6.1 State Management
 
 *We assume a*  \*PostgreSQL\*\* database handles relational data (Users, Applications) while **Redis** handles the Rate Limiting and Session caching.
 
\*S3/Object Storage\*\* is assumed for physical resume file storage, with the API returning signed URLs for secure access.
 
\### 6.2 AI Processing
 
 *AI operations (Parsing, Matching) are handled via an internal message queue (e.g., RabbitMQ or BullMQ). The API provides a*  `status`  *field for these resources. Clients should use either*  \*WebSockets\*\* (for real-time updates) or **Polling** on the specific resource ID.
 
\### 6.3 Validation Justification
 
\* The API uses strict JSON schema validation. Any extra fields in a request body are ignored (to allow forward compatibility), while missing required fields trigger a `422 Unprocessable Entity`.
 
\### 6.4 Security
 
\*CORS:\*\* Strictly configured to allow only JobPilot AI's official domains.
 
\*Headers:\*\* `Helmet.js` defaults applied (HSTS, No-Sniff, XSS-Filter).
 
\*PII:\*\* Personal Identifiable Information is encrypted at rest using AES-256.