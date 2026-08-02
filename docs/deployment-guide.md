deployment-guide.md

1. Purpose

This document provides a comprehensive guide for the deployment, management, and
scaling of the JobPilot AI ecosystem. It serves as a standard operating
procedure for DevOps engineers to ensure high availability, security, and
performance across the production and staging environments.

2. Deployment Architecture

The JobPilot AI infrastructure follows a modern, decoupled cloud architecture:

  - Frontend: React (TypeScript/Tailwind) hosted on Vercel for edge-optimized
    content delivery.
  - Backend: FastAPI (Python) hosted on Render (Web Service), providing an
    asynchronous RESTful API.
  - Database: MongoDB Atlas (Global Cluster) for scalable, document-oriented
    data storage.
  - AI Service: Integration with OpenAI API for resume parsing and content
    generation.
  - Authentication: Stateless JWT (JSON Web Tokens) for secure user sessions.

3. Environment Variables

To ensure security and portability, all sensitive configurations must be managed
via environment variables.

Frontend (Vercel)

  - VITE_API_BASE_URL: The URL of the backend API on Render.
  - VITE_APP_ENV: Deployment environment (staging/production).

Backend (Render)

  - MONGODB_URI: Connection string for MongoDB Atlas.
  - OPENAI_API_KEY: Secret key for AI feature integration.
  - JWT_SECRET_KEY: High-entropy string for signing tokens.
  - ALGORITHM: JWT encryption algorithm (e.g., HS256).
  - ACCESS_TOKEN_EXPIRE_MINUTES: Token TTL.
  - CORS_ORIGINS: JSON-formatted list of allowed frontend domains.

4. Frontend Deployment (Vercel)

Vercel is utilized for its seamless integration with React and automated CI/CD
pipelines.

1.  Project Connection: Link the GitHub repository to the Vercel Dashboard.
2.  Build Settings:
      - Framework Preset: Vite / Create React App (depending on specific
        scaffolding).
      - Build Command: npm run build or yarn build.
      - Output Directory: dist or build.
3.  Deployment Trigger: Automatic deployments are enabled for the main branch
    (Production) and develop branch (Staging).

5. Backend Deployment (Render)

Render hosts the FastAPI service as a managed Web Service.

1.  Service Type: Web Service.
2.  Environment: Python 3.10+ (or Docker, if a Dockerfile is present in the
    repository).
3.  Build Command: pip install -r requirements.txt.
4.  Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT.
5.  Health Check Path: /health (Endpoint must return a 200 OK status).

6. MongoDB Atlas Configuration

1.  Cluster Tier: M10+ recommended for production to ensure VPC peering and
    dedicated resources.
2.  Network Access: Use IP Whitelisting to allow Render’s outbound IP addresses
    (or allow access from anywhere 0.0.0.0/0 if static IPs are not assigned by
    the Render tier).
3.  Database User: Assign a user with readWrite permissions to the specific
    JobPilot database.
4.  Indexing: Ensure unique indexes are applied to the users collection (email)
    and applications collection (IDs) for query optimization.

7. Domain Configuration

  - Apex Domain/Subdomain: Managed via a DNS provider (e.g., Cloudflare,
    Namecheap).
  - Frontend: Point the CNAME record for app.jobpilot.ai to
    cname.vercel-dns.com.
  - Backend: Point the CNAME record for api.jobpilot.ai to the Render-provided
    service URL.

8. HTTPS & SSL

  - Automatic Provisioning: Both Vercel and Render provide automated Let’s
    Encrypt SSL certificates.
  - Enforcement: HTTP-to-HTTPS redirection must be enabled at the infrastructure
    level for both frontend and backend.

9. Environment Management

  - Staging: A mirror of production used for QA and UAT. It connects to a
    separate MongoDB Atlas cluster/database.
  - Production: The live environment accessible to end-users. Access is
    restricted to senior engineering staff.

10. Logging

  - Backend: FastAPI logs are captured via Render’s centralized log explorer.
    Structured logging (e.g., using Loguru) is utilized to track AI
    request/response cycles.
  - Frontend: Client-side errors are monitored using a service like Sentry or
    LogRocket for real-time debugging of user-facing issues.

11. Monitoring

  - Uptime Monitoring: External checks (e.g., UptimeRobot or Better Stack) to
    monitor endpoint availability.
  - Performance Metrics: Monitor Render's CPU and Memory usage charts to detect
    memory leaks in the Python runtime.
  - AI Usage: Track OpenAI token consumption via the OpenAI dashboard to prevent
    service interruptions due to quota limits.

12. Backup Strategy

  - Database: Enable MongoDB Atlas "Cloud Backup."
      - Frequency: Daily snapshots with 7-day retention for standard production.
      - Point-in-Time Recovery (PITR): Recommended for critical production
        tiers.
  - Configuration: Maintain an encrypted backup of all environment variables in
    a secure vault (e.g., 1Password or AWS Secrets Manager).

13. Security Best Practices

  - Least Privilege: Database users and API keys should only have the
    permissions necessary for their specific tasks.
  - CORS Policy: Restrict CORS_ORIGINS in FastAPI to the specific frontend
    domain.
  - Headers: Implement security headers (HSTS, X-Frame-Options, Content Security
    Policy) via FastAPI middleware.
  - Dependency Scanning: Use npm audit and safety (for Python) to check for
    vulnerable packages during CI.

14. Production Checklist

- [ ] Environment variables are correctly set for Production.
- [ ] Database indexes are built and verified.
- [ ] SSL certificates are active and valid.
- [ ] AI prompt templates are versioned and tested.
- [ ] JWT secret key is rotated from the staging key.
- [ ] Global error handlers are active (no stack traces exposed to users).

15. Rollback Strategy

  - Instant Rollback (Vercel): Use the Vercel dashboard to "Promote to
    Production" a previous successful deployment if a regression is detected.
  - Manual Rollback (Render): Revert the GitHub main branch to the last stable
    commit hash. Render will automatically trigger a redeploy of the stable
    version.

16. Scaling Strategy

  - Vertical Scaling: Increase Render instance type (e.g., from Starter to Pro)
    if RAM usage exceeds 80% during AI processing.
  - Horizontal Scaling: Increase instance count on Render and ensure MongoDB
    Atlas can handle the increased connection pool.
  - Frontend: Vercel scales automatically via its global Edge Network (CDN).

17. Maintenance Guidelines

  - Scheduled Downtime: For significant database migrations, notify users via
    in-app banners 24 hours in advance.
  - Dependency Updates: Monthly review of Python and NPM packages to keep up
    with security patches.

18. Future DevOps Improvements

  - Infrastructure as Code (IaC): Implement Terraform scripts to manage Render
    and MongoDB Atlas configurations.
  - Containerization: Transition fully to a Docker-based workflow for identical
    local/staging/prod environments.
  - Automated Performance Budgets: Integrate Lighthouse CI into the Vercel
    deployment pipeline to block builds that degrade performance.

Assumptions & Notes

  - Assumption: It is assumed that GitHub is the primary Version Control System
    (VCS).
  - Assumption: The backend uses uvicorn as the ASGI server.
  - Naming Consistency: All resource names in Vercel/Render should follow the
    jobpilot-ai-[env] convention.
