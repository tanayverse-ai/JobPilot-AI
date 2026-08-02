# JobPilot AI — Product Requirements Document

**Status:** Draft for product and design review  
**Product:** JobPilot AI  
**Audience:** Job seekers; initially individual users  
**Product type:** Private, AI-assisted job-search workspace

## 1. Executive summary

Job searching is a high-volume, emotionally demanding workflow spread across
job boards, email threads, documents, calendars, and personal notes. People
lose track of applications, miss follow-ups, reuse weak materials, and cannot
tell which actions improve interview outcomes. JobPilot AI is a private
workspace that brings that workflow together: users track each opportunity,
manage tailored materials, receive timely prompts, and use AI to improve—not
replace—their decisions.

The product must feel more useful than a spreadsheet on a user's first day:
adding a role should take little effort, the next best action should be clear,
and AI output must be reviewable, specific, and under the user's control.

## 2. Problem definition

### Problems to solve

1. **Fragmented information.** Application details, job descriptions, versions
   of résumés, recruiter messages, and interview notes live in separate places.
2. **Lost momentum.** Users forget follow-ups, interview preparation, and
   deadlines when applications reach double digits.
3. **Untailored applications.** Job seekers struggle to identify the most
   relevant experience and adapt their narrative efficiently.
4. **Weak feedback loop.** Users cannot easily see which sources, résumé
   versions, or job types lead to replies and interviews.
5. **Anxiety and unclear next steps.** Rejection, silence, and a large job
   search create decision fatigue; users need grounded action prompts, not
   vague motivation.

### Target users

The initial market is individual, English-speaking job seekers applying to
knowledge-worker and early-career roles. The product supports desktop planning
and mobile follow-up, without assuming a particular industry. It must serve
people who have only a few applications and people actively managing 50+.

### Why not Excel or Notion?

Spreadsheets and general workspaces are flexible but require users to create
their own status logic, formulas, reminders, linked materials, and analytics.
They do not understand a job description or offer contextual writing help.
JobPilot provides a job-search-native workflow: structured lifecycle stages,
timely next actions, linked materials, focused analytics, and AI assistance
that starts from the user's approved context. Export keeps the user in control
and prevents lock-in.

### Core value proposition

**Turn a scattered job search into a focused, measurable routine—then use AI
to improve each application while keeping the job seeker in control.**

### Biggest user pain points

| Pain point | Consequence | JobPilot response |
| --- | --- | --- |
| Losing track of roles and contacts | Missed deadlines and duplicate effort | A unified, searchable application workspace |
| Not knowing what to do today | Procrastination and stale applications | Prioritized next-action queue and reminders |
| Rewriting from a blank page | Slow, generic applications | Contextual résumé and cover-letter assistance |
| Interviewing without a system | Inconsistent preparation | Interview plan, question practice, and notes |
| No visibility into outcomes | Repeating ineffective habits | Funnel and source analytics |
| Privacy concerns with AI | Reluctance to share personal data | Explicit AI actions, retention controls, and export/delete options |

## 3. Product vision

### Vision statement

JobPilot AI will be the trusted personal operating system for a job search:
private by default, intelligent without being opaque, and practical enough to
help a person move from first saved role to a confident offer decision.

### Long-term vision

JobPilot becomes a career-management companion, not just an application list.
It will help users maintain career evidence, recognize market patterns, tailor
their positioning, prepare for high-stakes conversations, and make informed
offer decisions. Its recommendations will remain explainable and user-approved
rather than silently applying for roles or impersonating the user.

### Short-term MVP

The MVP proves the central loop: a user can create an account, capture an
application, attach or select a résumé, move it through a trustworthy status
timeline, see their immediate next actions, and export their data. The MVP
does not require AI to be useful; this protects the core experience from model
quality, cost, or provider availability.

### Future expansion

- Browser capture for job descriptions, with explicit review before saving.
- Email and calendar integrations for approved interview/reminder sync.
- Market-aware, user-configured benchmark insights.
- Role-specific interview simulations and coaching plans.
- Offer comparison and negotiation planning.
- Optional coach, mentor, or university-career-center collaboration with
  explicit, granular sharing permissions.
- Recruiter capabilities only as a separate, consent-first product surface;
  never a way to expose an individual's private search data.

## 4. User personas

| Persona | Goals | Frustrations | Expectations from JobPilot |
| --- | --- | --- | --- |
| **Aarav, final-year college student** | Land a first internship or graduate role; translate projects into evidence | Little professional experience; unfamiliar hiring stages; deadlines collide with coursework | Clear templates, low-jargon guidance, application deadlines, interview basics |
| **Meera, early-career fresher** | Secure her first full-time role and build confidence | Sends many similar applications with few responses; cannot tell what to improve | An easy tracker, résumé feedback, personalized action prompts, simple progress visibility |
| **Dev, experienced software engineer** | Run a discreet, efficient search for a senior role | Many recruiter conversations, multiple résumé variants, limited time | Fast capture, advanced filters, confidential handling, material versioning, source and conversion insights |
| **Nisha, career switcher** | Reframe transferable experience for a new field | Job descriptions feel unfamiliar; skills gaps are hard to prioritize | Skill-gap explanation, tailored narratives, realistic preparation plans, no exaggerated claims |
| **Rahul, returning professional** | Re-enter work after a caregiving or health-related break | Anxiety about gaps and a dated network; search pace varies | Flexible reminders, private notes, confidence-building but factual writing support, re-entry milestones |
| **Priya, university career adviser (future)** | Support students without taking over their job search | Fragmented student updates and inconsistent process | Opt-in progress sharing, aggregate cohort insights, and coaching prompts; no private access by default |

## 5. End-to-end user journey

| Stage | User objective and actions | Product response | Success signal |
| --- | --- | --- | --- |
| Landing page | Understand whether the tool solves a real problem | Communicate privacy, core workflow, examples, and pricing posture plainly | Visitor starts registration or returns later |
| Registration | Create a secure workspace quickly | Minimal sign-up, consent links, email verification where required, and a short onboarding choice | Account created and user reaches onboarding |
| Dashboard | Know what deserves attention today | Shows upcoming interviews, overdue follow-ups, planned actions, and recent applications—not an empty wall of charts | User understands their next action within seconds |
| Add first application | Capture a role before details are lost | Company, title, source, URL, status, deadline, description, and next-action fields; a rapid add path for essential fields | First application is saved with a next step |
| Upload/select résumé | Keep the right material with the role | Secure résumé library, clear file state, tags/version names, and optional application linking | A material is available and associated correctly |
| Track status | Keep a truthful record as events occur | Structured stages, timeline events, notes, contact records, and reminders | Status changes are recorded without losing history |
| Prepare interview | Translate a scheduled interview into focused preparation | Interview agenda, question generator, role-specific preparation checklist, notes, and follow-up prompt | User completes preparation actions and records outcome |
| Receive offer | Compare and decide with complete context | Offer status, terms fields, decision deadline, checklist, and private notes; future offer comparison | Offer is recorded and decision is intentional |

### First-session activation

The onboarding target is for a new user to add one real application and one
next action in under five minutes. A user may skip résumé upload and AI setup;
the product should never block basic tracking behind those steps.

## 6. Feature catalog and prioritization

### High priority — MVP foundations

| Feature | Why it exists / problem solved | User benefit |
| --- | --- | --- |
| Secure account and private workspace | Personal job-search data is sensitive | Trust that applications and documents are visible only to the user |
| Application lifecycle tracker | A generic list cannot represent recruiting progress | A clear record of every opportunity and its current stage |
| Application timeline and notes | Context disappears across calls, emails, and dates | A defensible history of actions, decisions, and outcomes |
| Dashboard and next-action queue | Users miss time-sensitive work | A focused daily plan, including follow-ups and interview preparation |
| Search, filters, and archive | Active searches become hard to navigate | Find the right role quickly without deleting history |
| Materials library | Résumé versions and supporting documents become disorganized | Reuse the correct, approved material for each role |
| Reminders | Follow-ups and deadlines slip | Timely prompts controlled by the user |
| Data export and account deletion | Users need ownership of their records | Portability and privacy confidence |

### Medium priority — productivity and job-quality support

| Feature | Why it exists / problem solved | User benefit |
| --- | --- | --- |
| Contact management | Recruiter and referral context is scattered | One record of relevant people and conversations |
| Interview workspace | Preparation tends to happen in loose notes | A repeatable, role-specific preparation routine |
| Saved views and lightweight board | Different users plan differently | Faster triage without compromising structured data |
| Email/calendar integrations | Manual transcription causes missed events | Less duplicate entry, only after explicit connection and review |
| Job-description capture | Saving a role should not require copying every field | Faster, more complete application creation |

### Low priority / future differentiation

| Feature | Why it exists / problem solved | User benefit |
| --- | --- | --- |
| Mentor/adviser collaboration | Some users want guided accountability | Opt-in support without sacrificing privacy |
| Offer comparison | Important decisions involve many factors | A structured, personal comparison process |
| Job-market insights | Applicants want context for strategy | Better-informed targeting, with transparent data limits |
| Recruiter workspace | Recruiters have a separate workflow | Potential future business line, deliberately isolated from user data |

## 7. AI feature design

### AI product principles

1. AI is assistive, never autonomous: no applications, messages, or profile
   changes are sent without the user's review and explicit action.
2. Outputs cite their source context where practical: job-description phrases,
   résumé bullets, and stated assumptions.
3. The product distinguishes recommendations from facts and asks for missing
   information instead of inventing achievements.
4. Every generation offers edit, copy, regenerate, and delete controls.
5. Inputs are minimized, user-authorized, size-limited, and excluded from
   training or retention beyond the chosen provider and product policy.
6. AI performance is measured for usefulness, factuality, safety, latency, and
   cost—not only generation volume.

| AI feature | User value and logical flow | Guardrails | Priority |
| --- | --- | --- | --- |
| **Résumé analysis** | User selects a résumé; the system extracts sections and evaluates clarity, evidence, consistency, and relevance. It returns prioritized findings and edit suggestions. | Never rewrites history as fact; flags uncertainty; preserves original file/text. | Medium |
| **Résumé match score** | User selects a résumé and job description. The system maps explicit skills, responsibilities, and keywords, then shows matched, missing, and weak-evidence areas. | A score is explanatory, not a hiring prediction; show contributing factors and avoid demographic inference. | Medium |
| **Cover-letter generator** | User chooses an application, résumé, and tone. The system drafts a concise letter grounded in selected evidence and the job description. | Requires user review; labels assumptions; does not fabricate company knowledge or accomplishments. | Medium |
| **Job-description summary** | The system extracts responsibilities, must-have skills, location/eligibility constraints, compensation when stated, and application steps. | Displays source excerpts/links to details; user confirms fields before saving. | Medium |
| **Interview question generator** | User picks role, interview stage, and focus areas. The system creates likely questions, why they may be asked, and a preparation plan. | Avoids presenting questions as leaked or guaranteed; supports accessibility and varying interview formats. | Medium |
| **Skill-gap analysis** | Compares stated role requirements with user-approved résumé/profile evidence, then groups gaps into learn now, demonstrate differently, or not essential. | Does not assume absence means lack of skill; user can correct evidence and dismiss suggestions. | Low |
| **AI career coach** | A conversational planner uses the user's chosen goals, current pipeline, and recent outcomes to suggest small next steps. | Clearly non-therapeutic/non-legal; avoids certainty about hiring outcomes; asks permission before using data. | Low |
| **Follow-up email generator** | With application stage and prior-contact context, drafts a brief follow-up or thank-you note. | Never sends automatically; requires recipient, timing, and factual claim review. | Medium |
| **Résumé improvement suggestions** | Converts analysis into line-level, evidence-based alternatives and asks the user to choose. | Original remains untouched; changes are suggestions, not silent edits. | Medium |

### AI quality acceptance criteria

- 90%+ of evaluated outputs must remain grounded in provided user/job context or
  clearly label a suggestion as generic.
- Zero critical hallucinations in the launch evaluation set, such as invented
  employers, degrees, certifications, or interview guarantees.
- Median time to a standard generation is under 10 seconds at launch target
  load, with a clear retry state when unavailable.
- Users can report a poor output and delete stored generations from their
  workspace.

## 8. Functional requirements

### Identity and account

- Users can register using an email address and password.
- Users can sign in, sign out, request password reset, and set a new password
  through a time-limited verified flow.
- Users can view and edit basic profile preferences, timezone, and notification
  preferences.
- Users can export their data and permanently request account deletion.
- The product records consent to applicable terms and privacy notices.

### Application management

- Users can create, view, edit, archive, restore, and delete their own job
  applications.
- Each application supports company, title, URL, source, status, location,
  workplace type, compensation notes, job description, application date,
  deadline, contacts, private notes, and next action.
- Users can use controlled lifecycle stages: saved, applied, screening,
  interviewing, offer, rejected, withdrawn.
- A status change creates an immutable timeline event; users can add additional
  dated events and notes.
- Users can filter, search, sort, paginate, and use saved views of applications.
- Users can mark applications as archived without losing history.

### Tasks, deadlines, and reminders

- Users can add a next action and due date to an application.
- The dashboard lists overdue, due-today, upcoming, and completed actions.
- Users can schedule reminders with an explicit time and selected delivery
  channel.
- Users can snooze, complete, edit, or dismiss a reminder.
- Reminder delivery failures are visible to the user and retry safely.

### Materials

- Users can securely upload, name, tag, view, download, replace, and delete
  allowed résumé and supporting-document files.
- Users can create and edit text-based cover letters.
- Users can associate one or more materials with an application while retaining
  the underlying material history.
- The system validates file type and size before storage and reports failures
  clearly.

### Contacts and interviews

- Users can add contacts and associate them with one or more applications.
- Users can schedule interview events with date/time, format, participants,
  notes, and preparation tasks.
- Users can record interview outcome and follow-up actions.
- Calendar/email data is only imported after explicit connection, scope review,
  and user confirmation of proposed matches.

### AI assistance

- Users can initiate each AI action with selected application/material context.
- Before generation, the UI shows which data will be used and permits removal
  of optional context.
- Users can view, copy, edit, save, regenerate, rate, and delete generated
  output.
- AI-produced content is visually labeled and is never sent, uploaded, or
  applied automatically.
- The system enforces per-user usage limits and shows an understandable failure
  state when service or quota is unavailable.

### Analytics

- Users can see their applications by stage, source, role type, and time period.
- Users can view response, screening, interview, and offer conversion metrics;
  definitions are visible alongside each metric.
- Users can filter analytics by date range and active/archived state.
- Analytics exclude data the user has deleted and update predictably after
  edits.

### Administration and support operations

- Authorized operators can monitor service health, aggregate anonymized
  operational metrics, security events, and AI error rates.
- Operators cannot browse personal application content by default.
- Support access, if ever needed, is time-bound, auditable, and user-consented
  where legally and operationally appropriate.

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| **Performance** | Core dashboard and application-list interactions should feel responsive; set launch targets of p95 API response under 500 ms for normal reads and under 1.5 s for standard writes, excluding external AI/file-provider time. Use pagination and bounded queries. |
| **Security** | Encrypt data in transit, hash passwords with a modern memory-hard algorithm, use short-lived authenticated sessions, protect against common web attacks, enforce authorization on every owned resource, validate all input, rate-limit sensitive endpoints, and keep secrets outside code and logs. |
| **Privacy** | Collect only necessary data, explain AI data use, allow export/deletion, retain minimal AI audit data, and prohibit sale of personal job-search content. Complete legal/privacy review before launch. |
| **Scalability** | Keep web client, API, database, file store, and AI provider loosely coupled. Support horizontal API scaling, indexed tenant-scoped database queries, background processing for slow jobs, and provider timeouts/retries. |
| **Reliability** | Target 99.5% monthly availability for core tracking at MVP. Use health checks, backups, idempotent writes where appropriate, error monitoring, and graceful degradation when AI or integrations fail. |
| **Accessibility** | Meet WCAG 2.2 AA for core flows: keyboard access, visible focus, semantic labels, error announcements, readable contrast, responsive text, and non-color-only status information. |
| **Maintainability** | Use domain-oriented modules, documented API contracts, automated tests, code review, typed interfaces, consistent observability, and decision records. AI prompts and evaluation cases are versioned product assets. |
| **Responsiveness** | Support current desktop and mobile browsers. Mobile prioritizes dashboard, capture, reminder completion, and status updates; complex editing remains usable without horizontal scrolling. |
| **Availability and recovery** | Publish planned maintenance communication, monitor uptime, back up production data, test restoration, and define incident response severity and user-notification practice. |

## 10. Competitor analysis

| Product | Strengths | Gaps / trade-offs | JobPilot opportunity |
| --- | --- | --- | --- |
| **Huntr** | Established tracker approach, board visualization, application organization | Value depends on workflow preference; advanced intelligence and user control must remain clear | Pair disciplined tracking with a calmer next-action experience, explainable AI, and portable data |
| **Teal** | Strong résumé-oriented workflow and job-search tooling | Users may experience feature breadth as complexity; pricing/value needs a clear story | Offer a focused core loop before advanced tooling, make material-to-application relationships transparent |
| **Notion** | Flexible, customizable, familiar to many users | Requires setup and maintenance; no native job-search lifecycle, reminders, or contextual AI | Deliver ready-made structure without losing notes flexibility or exportability |
| **Excel spreadsheet** | Universal, cheap, private, fully controllable | Manual formulas, weak reminders, difficult document context, little assistance | Preserve user control and export while removing repetitive tracking and analysis work |

This comparison is directional and must be refreshed with current pricing,
feature, security, and user-review research before public positioning. The
product should not claim superiority without evidence from user testing.

## 11. Product roadmap

| Phase | Scope | Why this order |
| --- | --- | --- |
| **Phase 0: Discovery and foundations** | User interviews, prototype tests, information architecture, privacy/legal review, design system, security and data model decisions | Validates the problem and avoids building AI on an untrusted workflow |
| **Phase 1: MVP** | Accounts, application tracker, status timeline, dashboard/next actions, basic reminders, materials library, export/delete, responsive accessible UX | Delivers standalone daily value and establishes reliable user-owned data |
| **Phase 2: Productivity features** | Search/saved views, contacts, interview workspace, richer reminders, job capture, optional calendar/email integrations | Reduces manual effort after the core data loop proves useful |
| **Phase 3: AI features** | Description summary, résumé analysis/match, cover letters, follow-ups, interview questions, feedback/evaluation controls | Adds AI only where trusted context and user workflow already exist |
| **Phase 4: Analytics** | Funnel, source, time, material, and activity insights with metric definitions | Analytics need enough quality historical data to be meaningful |
| **Phase 5: Premium and expansion** | Advanced AI coaching, offer comparison, market insights, mentor collaboration, premium storage/usage tiers | Monetize differentiated value after retention and trust are demonstrated |

### MVP launch boundaries

The MVP will not include autonomous job applications, scraping behind login
walls, recruiter access to user data, social networking, AI claims of hiring
probability, or heavy integrations that delay core usability.

## 12. Success metrics

Metrics must be segmented by acquisition channel, persona where voluntarily
known, and cohort. They must never become pressure to increase application
volume at the expense of fit or user wellbeing.

| Metric | Definition / target direction | Why it matters |
| --- | --- | --- |
| Activation rate | % of new accounts that create one application and one next action within 24 hours; establish baseline, then improve | Tests first-session value |
| Weekly active trackers | Unique users who view or update their workspace weekly | Measures sustained workflow utility |
| Applications tracked | Median applications captured per active searcher, interpreted with search duration | Indicates tracking adoption, not application quality alone |
| Next-action completion | % of due actions completed, rescheduled, or consciously dismissed | Tests whether planning features help users act |
| AI assisted-task completion | % of AI sessions that lead to an edit, save, copy, or task completion; pair with satisfaction rating | Measures usefulness rather than raw prompts |
| Interview conversion rate | Applications reaching interview / applications with a completed application date, using a defined time window | A directional outcome metric; avoid causal claims without controlled study |
| D30 retention | % of activated users active 30 days after sign-up | Tests durable product value |
| Privacy trust score | Survey response to control, clarity, and confidence in data handling | Trust is central to adoption |
| Reliability | Core tracking uptime, error rate, reminder delivery success, and recovery time | Protects user trust during time-sensitive searches |

Initial numeric targets should be set after a four-to-six-week instrumented beta
establishes realistic baselines. A North Star candidate is **weekly active users
who complete at least one meaningful job-search action**, not simply time spent.

## 13. Risks and open questions

| Risk / question | Product response needed before or during MVP |
| --- | --- |
| Will users trust a new app with a confidential search? | Test messaging, privacy controls, data export/delete, and visible account security in interviews and usability studies |
| What makes switching from a spreadsheet worthwhile? | Validate the first-session workflow against an existing user spreadsheet; measure time and clarity gains |
| How much AI is actually helpful? | Run task-based evaluations and user tests before charging for AI; prioritize factuality and editability |
| Could AI cause misleading applications? | Require approval, preserve originals, evaluate hallucinations, and prohibit unsupported claim generation |
| Which reminder channel is wanted? | Start in-product; validate email/push preferences and consent expectations before adding channels |
| How will the product monetize responsibly? | Test a transparent freemium boundary around advanced AI/storage, never hold essential export or deletion behind payment |

## 14. Release readiness criteria for Phase 1

- Representative users can add, find, update, and archive an application
  without assistance in usability testing.
- Privacy policy, terms, data export, deletion process, and support path are
  ready for the launch jurisdiction.
- Core lifecycle, ownership authorization, authentication, error states, and
  accessibility flows pass acceptance tests.
- Monitoring, backups, recovery process, and incident ownership are in place.
- No critical security findings remain open from the agreed pre-launch review.
- Product instrumentation measures activation, core actions, reliability, and
  consent without collecting unnecessary sensitive content.

## 15. Next planning actions

1. Interview 8–12 people across the first five personas using their current
   tracking workflow and a realistic job-search scenario.
2. Convert MVP flows into low-fidelity wireframes and run task-based usability
   testing before visual design.
3. Prioritize the MVP backlog using impact, risk, confidence, and effort.
4. Create a privacy/data-retention decision record and an AI evaluation plan
   before enabling any AI feature.
