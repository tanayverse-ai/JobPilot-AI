User Flow Documentation: JobPilot AI

Project: JobPilot AI
Version: 1.0.0
Status: Final / Production-Ready
Author: UX Architecture Team

1. Document Purpose

This document outlines the end-to-end user journeys for the JobPilot AI
platform. It serves as the blueprint for frontend implementation, state
management logic, and backend API orchestration. Every flow is designed to
minimize friction while maximizing the value of AI-driven career automation.

2. Global State & Architecture Assumptions

To maintain consistency with the existing tech stack, the following
architectural assumptions apply:

  - Authentication: Managed via Supabase Auth (JWT-based).
  - Persistence: All user-generated content and application states reside in
    PostgreSQL.
  - AI Orchestration: Asynchronous processing for resume parsing and content
    generation with optimistic UI updates.
  - Navigation: Next.js App Router for server-side rendering and client-side
    transitions.

3. High-Level User Flow Map

graph TD
    A[Landing Page] -->|CTA: Get Started| B[Register]
    B --> C[Onboarding Flow]
    C --> D[Dashboard]
    A -->|Login| E[Login]
    E --> D
    D --> F[Add Job]
    F --> G[Upload/Select Resume]
    G --> H[Generate Cover Letter]
    H --> I[Prepare Interview]
    I --> J[Track Progress]
    J --> K[Analytics]

4. Detailed Journey Breakdowns

4.1 Onboarding Flow (The First-Mile Experience)

Trigger: Successful registration or first-time login. Goal: Initialize the AI
engine with user context to provide personalized results immediately.

1.  Welcome Screen: Brief value proposition (Career Co-pilot).
2.  Role Profiling: User enters "Target Job Title" and "Seniority Level."
3.  Core Resume Upload: User uploads their "Master Resume" (PDF/DOCX).
      - System Action: Background worker triggers AI parsing to extract skills,
        experience, and education.
4.  Goal Setting: User selects weekly application targets (e.g., 5
    applications/week).
5.  Completion: Redirect to Dashboard with a "Quick Start" guide.

4.2 Primary Success Path: The "Power Apply" Flow

Trigger: User finds a job they want to apply for.

| Step                | Action                                       | System Response                                                                                 |
| :------------------ | :------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| **1. Add Job**      | User pastes URL or enters details manually.  | AI scrapes the URL, extracts Job Description (JD), Company Name, and Key Requirements.          |
| **2. Analysis**     | User clicks "Analyze Match."                 | System displays a "Match Score" (%) and identifies missing keywords based on the Master Resume. |
| **3. Tailor Asset** | User selects "Generate Cover Letter."        | AI synthesizes the JD and Resume to create a bespoke, markdown-formatted letter.                |
| **4. Refinement**   | User edits or regenerates specific sections. | UI updates in real-time; changes are saved to the Job Application record.                       |
| **5. Apply**        | User marks as "Applied."                     | Entry moves from 'Draft' to 'Applied' in the Kanban board.                                      |

4.3 Interview Preparation Flow

Goal: Reduce anxiety and improve performance via AI-simulated questions.

1.  Selection: User selects an "Applied" job from the Dashboard.
2.  Action: Click "Prepare for Interview."
3.  Generation: AI generates 5-10 likely interview questions based on the
    specific JD and the user's specific experience.
4.  Practice: User types or dictates answers.
5.  Feedback: AI provides "Critique & Improved Answer" for each response.

5. Alternate Flows

5.1 The "Browser Extension" Shortcut

  - Scenario: User is on LinkedIn/Indeed and wants to save a job without leaving
    the tab.
  - Flow:
    1.  Click JobPilot Extension icon.
    2.  Extension captures DOM content of the job post.
    3.  User clicks "Save to JobPilot."
    4.  Data is pushed to the jobs table via API.
    5.  User receives a notification: "Job saved. View in Dashboard?"

5.2 Guest-to-User Conversion

  - Scenario: User uses the "Resume Scorer" tool on the Landing Page without an
    account.
  - Flow:
    1.  Upload Resume + Paste JD on Landing.
    2.  System shows "Partial Score" and blurred insights.
    3.  CTA: "Sign up to see full analysis and missing keywords."
    4.  Upon Registration, the uploaded data is associated with the new user_id
        (Post-auth hook).

6. Error & Exception Flows

6.1 AI Parsing Failure

  - Condition: Uploaded resume is an image or corrupt PDF.
  - User Experience:
    1.  Inline Toast notification: "We couldn't read this file format."
    2.  Offer manual entry form or a "Download Template" option.
    3.  Clear instructions on supported formats (PDF, DOCX, < 5MB).

6.2 Subscription/Rate Limit Gate

  - Condition: Free tier user exceeds the monthly "Generation" limit.
  - User Experience:
    1.  User clicks "Generate Cover Letter."
    2.  Modal appears: "You've reached your limit for this month."
    3.  Present Tier Upgrade options (Pro/Enterprise).
    4.  Option to "Wait until [Date]" or "Refer a friend for 5 more credits."

6.3 Network Interruption during Generation

  - Condition: Socket connection drops while AI is streaming text.
  - User Experience:
    1.  Display "Connection lost. Reconnecting..."
    2.  Logic: Implement exponential backoff for the API call.
    3.  If permanent failure: "We saved your progress. Click 'Resume Generation'
        to continue."

7. Analytics & Progress Tracking

Goal: Data-driven career management.

  - Metric 1: Funnel Health: Visualization of Applied -> Interview -> Offer
    conversion rates.
  - Metric 2: Skill Gaps: A radar chart showing skills requested in JDs vs.
    skills present in the Master Resume.
  - Metric 3: Activity Heatmap: Consistency tracking to encourage daily
    application habits.
  - UX Implementation: Interactive Charts (using Tremor or Shadcn/ui Charts)
    with "Insight Tooltips" explaining what the data means for the user's search
    strategy.

8. Technical UX Requirements

| Feature             | Requirement                                       | Reason                                                           |
| :------------------ | :------------------------------------------------ | :--------------------------------------------------------------- |
| **Optimistic UI**   | Job status updates must reflect instantly.        | Perception of speed in a database-heavy app.                     |
| **Streaming AI**    | Cover letters should stream (Server-Sent Events). | Reduces "Time to First Byte" and improves perceived performance. |
| **Skeleton States** | Dashboard cards must use Skeletons during fetch.  | Prevents layout shift (CLS) during data hydration.               |
| **Persistence**     | Auto-save drafts every 30 seconds.                | Prevents data loss during long-form editing or interview prep.   |

9. Final Decision Justification

  - Why a Kanban board for Tracking? Standardized mental model for "Process
    Management" (familiar to users of Trello/Jira).
  - Why Onboarding for Resumes? Without a baseline resume, AI personalization is
    generic. Forcing this early ensures high-value output on the first "Add Job"
    action.
  - Why Markdown for Assets? Portability. Users can easily copy-paste into Word,
    Google Docs, or PDF without losing structure.
