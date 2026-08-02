# JobPilot AI

# UI Components Documentation

Version: 1.0

Status: Draft

Author: Product Engineering Team

---

# Purpose

This document defines every reusable user interface component used throughout the JobPilot AI application.

The objective is to ensure consistency, scalability, accessibility, responsiveness, and maintainability across the entire product.

Every frontend component should be built using these standards.

---

# Design Principles

The UI follows these principles:

• Clean and minimal

• Professional SaaS interface

• Mobile First

• Responsive

• Accessible (WCAG)

• Reusable Components

• Consistent spacing

• Consistent typography

• Fast interactions

• Dark Mode support

---

# Component Categories

The application UI is divided into the following categories.

1. Layout Components

2. Navigation Components

3. Form Components

4. Dashboard Components

5. Job Components

6. Resume Components

7. Interview Components

8. Analytics Components

9. AI Components

10. Feedback Components

11. Utility Components

12. Settings Components

13. Profile Components

14. Authentication Components

15. Common Components

---

# Layout Components

## App Layout

Purpose

Provides the overall page structure.

Used On

Entire Application

Contains

• Navbar

• Sidebar

• Content Area

• Footer

Responsive

Desktop

Tablet

Mobile

States

Normal

Collapsed Sidebar

Loading

Accessibility

Keyboard Navigation

Screen Reader Support
## Navbar

Purpose

Provides top navigation.

Items

Dashboard

Applications

Resume

Analytics

AI Assistant

Settings

Notifications

Profile

Behavior

Sticky

Responsive

Collapsible

Search Support

Accessibility

Tab Navigation

ARIA Labels
## Sidebar

Purpose

Primary navigation menu.

Features

Collapse

Expand

Active Highlight

Icons

Nested Menu

Responsive

Desktop

Drawer on Mobile
## Primary Button

Purpose

Used for major actions.

Examples

Login

Register

Save

Upload Resume

Generate AI

States

Default

Hover

Pressed

Disabled

Loading

Icon Support

Yes

Accessibility

Keyboard

Screen Reader
## Text Input

Purpose

Collect user information.

Used In

Login

Registration

Job Form

Profile

Validation

Required

Maximum Length

Pattern Validation

States

Focused

Error

Disabled

Read Only
## Dashboard Summary Card

Purpose

Displays important statistics.

Content

Title

Icon

Value

Trend

Color Indicator

Examples

Applications

Interviews

Offers

Rejections

Loading Skeleton

Supported

Responsive

Yes
## Job Application Card

Purpose

Displays one job application.

Information

Company

Role

Status

Applied Date

Priority

Salary

Location

Actions

View

Edit

Delete

Move Status

Responsive

Desktop

Tablet

Mobile
## AI Chat Panel

Purpose

Allows interaction with AI.

Features

Markdown Rendering

Typing Animation

Copy Response

Regenerate

Clear Chat

Suggested Prompts

History

Loading Indicator

Accessibility

Keyboard Support
## Resume Upload

Purpose

Upload multiple resumes.

Supported Formats

PDF

DOCX

Maximum Size

10 MB

Validation

Duplicate Detection

File Type

Virus Scan Ready

Upload Progress

Available

Preview

Available
## Analytics Widget

Purpose

Visualize statistics.

Supported Charts

Bar

Line

Pie

Area

Export

PNG

PDF

CSV

Responsive

Yes
## Notification Toast

Types

Success

Warning

Error

Info

Duration

5 Seconds

Manual Close

Supported

Stacking

Supported
## Empty State

Purpose

Displayed when no data exists.

Examples

No Applications

No Resume

No Interviews

Illustration

Supported

Primary Action

Add First Application
# Responsive Guidelines

Desktop

1200+

Tablet

768–1199

Mobile

Below 768

Rules

Drawer Navigation

Touch Friendly Buttons

Larger Inputs

Bottom Navigation (Optional)

Sticky Action Button
# Accessibility

Keyboard Navigation

Focus Indicator

ARIA Labels

Screen Reader Support

Color Contrast

Semantic HTML

Reduced Motion Support
# Dark Mode

Supported

Yes

Rules

Automatic Theme Detection

Manual Toggle

Persist User Preference

Accessible Colors