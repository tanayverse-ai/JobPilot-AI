# JobPilot AI — Screen Design Specification

**Status:** Pre-development UX specification. No application code is in scope.

## Experience rules

- The product is action-first: every authenticated screen shows a clear next
  move, not just data.
- Privacy is explicit: uploads, integrations, and AI use explain the data being
  used before proceeding.
- Essential fields come first; details are progressively disclosed.
- Every screen must meet keyboard, label, focus, contrast, and small-screen
  accessibility requirements.

## Shared components and states

| Shared element | Required behavior |
| --- | --- |
| App shell | Desktop side navigation (Dashboard, Applications, Resumes, Analytics, AI); mobile bottom navigation; profile menu and an easy-to-reach Add application action. |
| Forms | Persistent labels, helper text, field-level errors, top error summary after submit, and unsaved-change warning on exit. |
| Buttons | One primary action per task; submitting controls show progress and block duplicate submission. Destructive actions require confirmation. |
| Status | Stage badge includes text and icon/pattern, never color alone. |
| Loading | Use layout-preserving skeletons. Keep existing data visible during refresh; do not flash empty states. |
| Errors | Explain what failed, whether changes were saved, and a recovery action. Never show secrets or raw provider errors. |
| Empty states | Say why the screen is empty and provide one useful next action. Never use fake data or generic placeholders. |

## 1. Landing Page

**Purpose:** Explain the job-search problem JobPilot solves, establish privacy
trust, and guide visitors to Register or Login.

**Components:** Top navigation; hero with value statement, product preview and
two CTAs; problem-to-outcome section; Track/Prepare/Improve/Learn workflow;
privacy and ownership panel; feature preview; FAQ; legal/support footer.

**Buttons:** `Start free` → Register; `Login` → Login; `See how it works` →
workflow section; footer policy/support links.

**Inputs:** None initially. Do not add marketing email capture without approved
consent policy.

**User flow:** Visitor arrives → understands value and privacy position → starts
registration or signs in.

**Validation:** Accessible names for all navigation; in-page links land on
visible headings.

**States:** Empty is not applicable—omit unavailable dynamic sections. Static
content renders immediately; nonessential visuals load without layout shift. A
failed asset has meaningful fallback text; primary-navigation failure shows a
retryable error page with support/legal links.

## 2. Login

**Purpose:** Return a user safely to their private workspace without revealing
whether an email address has an account.

**Components:** Minimal auth layout, logo, “Welcome back” heading, Email and
Password fields, password visibility toggle, inline alert, password-reset link,
register link, legal links.

**Buttons:** `Log in` submits; visibility toggle changes only password display;
`Forgot password?` starts recovery; `Create an account` opens Register.

**Inputs:** Email (required, email keyboard, autocomplete email, trim spaces);
Password (required, masked, autocomplete current-password, paste allowed).

**User flow:** Enter credentials → valid session → intended protected page or
Dashboard. Invalid/expired session remains on Login with recovery guidance.

**Validation:** Required email and valid email shape; required password. Failed
credentials always say “Email or password is incorrect.” Repeated attempts show
a rate-limit retry message.

**States:** Empty = focused blank form. Loading = “Signing in…” and disabled
submit while preserving values. Errors = generic credential error, distinct
rate-limit message, or connection issue with Retry.

## 3. Register

**Purpose:** Create a secure account with clear terms and a short path to first
application activation.

**Components:** Auth layout, Display name/Email/Password/Confirm password form,
password requirements, terms/privacy consent, Login link.

**Buttons:** `Create account`; password visibility toggles; `Log in instead`;
policy links that preserve form state.

**Inputs:** Display name (2–80 trimmed chars); Email (required, normalized);
Password (minimum approved policy length, safe maximum, new-password
autocomplete); Confirm password; required terms/privacy checkbox.

**User flow:** Register → validate → account created → verification if required
→ onboarding/Dashboard prompt to add first application.

**Validation:** Field-level on blur/submit; consent required; passwords match;
duplicate email says “This email is already registered. Log in or reset your
password.” No pre-checked marketing consent.

**States:** Empty = blank first field. Loading = “Creating account…” and no
duplicate submit. Error = preserve safe inputs, never redisplay password, and
show retry/verification guidance.

## 4. Dashboard

**Purpose:** Answer “What should I do next?” rather than acting as a dense
analytics page.

**Components:** Greeting and pipeline summary; primary Add application CTA;
Today/next-action queue; upcoming interviews; recent applications; simple stage
snapshot; data-supported improvement insight.

**Buttons:** `Add application`; per-action `Complete`, `Reschedule`, `View`;
per-interview `Prepare`; pipeline stage/count opens filtered Applications;
`View all applications`.

**Inputs:** Optional quick date/filter controls only; choices persist through
navigation.

**User flow:** Sign in → see prioritized action → complete/reschedule/open the
application → cards and counts confirm progress.

**Validation:** Reschedule requires valid date/time; task completion never
silently changes application stage; missing required outcome prompts clearly.

**States:** Empty = “Your search starts here” with `Add your first application`.
Loading = skeleton for cards while Add remains available. Error = one failed
card does not break the page; card-level Retry, then global error boundary.

## 5. Applications

**Purpose:** Be the searchable, authoritative list of all applications and
support status-aware triage.

**Components:** Title/count/Add CTA; company/title search; filter bar (status,
date, source, location, next-action); active chips; sort control; list/table
default plus optional board; rows/cards with company, role, stage, last activity
and next action; pagination.

**Buttons:** `Add application`; `Filters`, `Clear all`, `Sort`, view toggle;
row opens detail; overflow `Edit`, `Archive/Restore`, `Delete`.

**Inputs:** Debounced, clearable search; keyboard-removable multi-select
filters; allow-listed sort values.

**User flow:** Open list → search/filter → inspect/edit a role, or Add Job →
save → return with the new row visible.

**Validation:** Invalid filters safely reset with notice; archive/delete confirm
impact; every query remains restricted to the signed-in user.

**States:** Empty = Add first application. No matches = explain current filters
and `Clear filters`. Loading = list skeleton, never empty flicker. Error = retain
old results when available; otherwise Retry and support reference.

## 6. Add Job

**Purpose:** Capture a real opportunity rapidly while collecting enough context
for follow-up and later AI help.

**Components:** Heading and back/close; Essentials section; Next step section;
collapsible optional Details; materials picker; sticky Cancel/Save footer.

**Inputs:**

| Field | Rule |
| --- | --- |
| Company name | Required, 2–120 trimmed characters |
| Job title | Required, 2–160 trimmed characters |
| Status | Controlled enum; default Saved |
| Job URL | Optional http/https URL |
| Source | Optional controlled value plus Other text |
| Date applied | Required for Applied and later stages; confirm unusual future date |
| Next action and due date | Either optional; due date requires action and valid date/time |
| Details | Optional location, workplace type, salary notes, contact, job description, private notes, materials |

**Buttons:** `Save application`; `Cancel`/Back; post-save `Add another`;
`Paste job description`; `Attach resume` without losing entered data.

**User flow:** Dashboard/Applications → Add Job → essentials → optional detail
and next action → Save → confirmation → detail or Applications.

**Validation:** Field-level errors plus summary; retain values on failure;
similar existing role may warn but never block; displayed text and URLs are
sanitized and external URLs are never fetched silently.

**States:** Empty = essentials blank, optional sections collapsed with examples.
Loading = form ready immediately; material choices skeleton; saving blocks
duplicate submission. Error = “Application was not saved,” Retry, and session
draft retention.

## 7. Resume Manager

**Purpose:** Give users a controlled library of resumes and supporting materials
with a clear relationship to applications.

**Components:** Heading/storage note; Upload resume and Create cover letter;
type filters; material cards with name/type/tags/date/linked count/state; detail
drawer; secure upload dialog with allowed formats, size, progress, privacy note.

**Buttons:** `Upload resume`, `Create cover letter`; card `View`, `Rename`,
`Duplicate as new version`, `Link to application`, `Download`, `Delete`; detail
`Use with application`, optional `Analyze with AI`.

**Inputs:** Keyboard-accessible file picker/drop zone; required editable material
name; required type; bounded optional tags; accessible text editor for cover
letters.

**User flow:** Resume Manager → upload → precheck → progress → name/tag → Ready
material → link to application or use later.

**Validation:** Enforce allowed type, MIME verification, size, safe filename,
scan/provider policy, and ownership. Similar file offers deliberate new-version
choice. Delete explains links and never removes application history silently.

**States:** Empty = Upload resume with supported formats. Loading = card
skeletons; upload gives exact progress and cancellation where available. Error =
invalid file fails early; upload/preview failure offers Retry and never claims a
file saved until it is confirmed.

## 8. Analytics

**Purpose:** Help users learn from recorded search activity without implying a
hiring prediction or overinterpreting thin data.

**Components:** Heading/transparency note; date and archive filters; metric cards
with definitions; stage funnel; time trend; source-performance table with sample
size; data-quality card with cleanup links.

**Buttons:** Date presets/custom date, `Reset filters`; chart/table drill-through
to Applications; optional `Export analytics` only after privacy/format approval.

**Inputs:** Valid date range; status/archive controls; allow-listed breakdown
(source, role type, workplace type).

**User flow:** Analytics → set period → learn pipeline/source patterns → drill
into records → clean data or adapt search strategy.

**Validation:** Start cannot follow end; every rate shows its denominator; small
samples show “Not enough data”; exclusions and timezone are explained.

**States:** Empty = explain that updated applications unlock trends, link to
Applications. Loading = fixed-size chart/metric skeletons. Error = one chart can
fail independently with Retry; failed export explicitly says no export exists.

## 9. AI Assistant

**Purpose:** Deliver reviewable job-search help grounded in user-selected
context—not an unrestricted, autonomous chatbot.

**Components:** Heading, privacy/control statement, quota; task chooser
(resume analysis, resume match, cover letter, job summary, interview questions,
follow-up email); context panel; task form; Generate action; results with
sources/assumptions; scoped history.

**Buttons:** Task cards; `Choose application`, `Choose resume`, `Edit included
context`; `Generate`; optional `Stop`; results `Copy`, `Edit`, `Save`,
`Regenerate`, `Report issue`, `Delete`.

**Inputs:** Required available task; user-owned application/material selector;
job description when needed; optional allow-listed tone/focus and bounded extra
instructions; required context consent when policy requires it.

**User flow:** Choose task → select/review context → Generate → inspect output
and assumptions → edit/copy/save deliberately or discard. Nothing is sent or
attached automatically.

**Validation:** Check required context, length, eligibility, quota, and consent
first. Reference content is untrusted and cannot override product rules. Output
must label missing evidence, generic advice, and unsupported claims.

**States:** Empty = first-use privacy explainer and one recommended task. Loading
= selected context plus cancellable “Generating…” state; partial text is clearly
streaming. Error = distinct invalid-context, quota, safety, timeout, and network
messages; retain inputs and state whether output was created.

## 10. Settings

**Purpose:** Centralize workspace preferences, notifications, integrations,
privacy/data control, and security actions.

**Components:** Subnavigation: Preferences, Notifications, Integrations,
Privacy & data, Security. Each section has plain-language explanation and clear
save behavior.

**Buttons:** Section `Save changes`; notification toggles; `Connect`/
`Disconnect`; `Export my data`; `Delete account`; `Change password`; session
controls if included.

**Inputs:** Timezone/date format/default view/theme; reminder channel/lead time/
quiet hours; approved integration scopes; AI data preference; current/new/confirm
password where applicable; typed delete confirmation.

**User flow:** Select setting category → change scoped preference → save → clear
confirmation. High-impact action → implication review → re-authenticate/confirm
if required → receipt/status.

**Validation:** Valid timezone/quiet hours; security notices cannot be opted out;
integration scopes are shown before connection; password requires current value
and confirmation; export/delete use re-authentication where policy requires it.

**States:** Empty = no integration explains it is optional. Loading = section
skeletons/independent saving controls. Error = display last confirmed state and
unsaved edit; disconnect failure confirms whether access remains connected.

## 11. Profile

**Purpose:** Manage optional personal career context for private personalization,
without requiring sensitive information.

**Components:** Profile summary (avatar/initials, display name, email/verified
state); optional-completion cue; About, current/target role, location preference,
experience highlights, skills; AI-context privacy note.

**Buttons:** `Edit profile`/`Save profile`; optional `Change photo`/`Remove
photo`; `Add skill`; skill remove; `Review AI context`.

**Inputs:** Display name (required, 2–80 chars); optional bounded About and
highlights; current/target role; approximate location preference; normalized
skill tags; optional allowed image type/size photo.

**User flow:** View private profile → edit selected information → save →
confirmation → data is available only to user-controlled contexts such as AI.

**Validation:** Length/tag/image constraints and safe display. No demographic,
disability, citizenship, address, or salary information is required. Removing a
field prevents future AI use and explains any current-context impact.

**States:** Empty = dismissible, optional completion guidance and full access to
MVP tracking. Loading = field skeletons with navigation. Error = retain edits,
say profile was not updated; failed photo upload keeps prior photo unchanged.

## Cross-screen acceptance checklist

- Every primary action has loading, success, validation, and recoverable-error
  behavior.
- Destructive actions confirm impact; user-generated content renders safely.
- Forms work by keyboard, label each control, announce errors, and avoid
  hover-only interactions.
- Mobile keeps primary actions visible and avoids horizontal scrolling.
- Screens not specified here—including application detail, password recovery,
  onboarding, interview detail, and deletion confirmation—must be designed and
  reviewed before their implementation begins.

## Research decisions before visual design

1. Validate that the next-action Dashboard feels supportive, not intrusive.
2. Test the Add Job progressive form with real applications and job descriptions.
3. Determine whether list/table/board should all launch or whether one view is
   enough for the MVP.
4. Test whether users understand the boundary between Profile, Materials, and
   explicit AI context.
5. Select the first AI task only after the non-AI tracking loop is validated.
