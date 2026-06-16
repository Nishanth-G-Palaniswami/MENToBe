# Requirements Document

# MentorMatch MVP — Requirements

## Introduction

MentorMatch is a Tinder-style mentorship matching platform that pairs mentees (students and early-career grads) with mentors (mid-to-senior professionals). The MVP delivers a mobile-first web experience covering auth, profile setup, swipe-based discovery, messaging, AI meeting notes, and basic plan management. Source spec: Miro board "Finder" (https://miro.com/app/board/uXjVHEi3EjE=/).

## Glossary

- **Mentee** — User seeking mentorship, age 18–28 typical.
- **Mentor** — User offering mentorship, age 30–55 typical.
- **Match** — A pair of users who have both swiped right on each other.
- **Active connection** — An unarchived match with messaging open.
- **Free tier limit** — 3 simultaneous active connections.

## Requirements

### 1. Authentication and role selection

**User story:** As a new user, I want to create an account and pick whether I'm a mentee or mentor, so I see the right onboarding flow.

#### Acceptance criteria

1. WHEN the user opens the app for the first time THEN the system SHALL display the authentication screen with Google sign-in and email sign-up options.
2. WHEN the user successfully authenticates AND has no role on file THEN the system SHALL display the role-selection screen with two cards: "Mentee" and "Mentor".
3. WHEN the user selects a role THEN the system SHALL persist the role to their account and route them to the matching onboarding flow.
4. WHEN the user signs in on a subsequent visit AND already has a role THEN the system SHALL skip role selection and route to the discover screen.
5. WHILE the user is unauthenticated THE system SHALL prevent access to all routes other than auth and marketing pages.

### 2. Mentee profile onboarding

**User story:** As a mentee, I want to set up my profile so the matching algorithm can recommend relevant mentors.

#### Acceptance criteria

1. WHEN a new mentee enters onboarding THEN the system SHALL present a multi-step form covering: subjects to learn, career interests, background/studies, other interests, languages, preferred meeting frequency (weekly/monthly/ad hoc), preferred teaching styles, and personal values.
2. WHEN the mentee submits the onboarding form THEN the system SHALL validate that subjects, career interests, background, and at least one language are provided.
3. WHEN onboarding is complete THEN the system SHALL request initial match recommendations from the AI matching service.
4. IF the mentee abandons onboarding mid-flow THEN the system SHALL persist completed steps so they can resume.

### 3. Mentor profile onboarding

**User story:** As a mentor, I want to set up my profile and get verified so I appear in trusted mentee feeds.

#### Acceptance criteria

1. WHEN a new mentor enters onboarding THEN the system SHALL present a multi-step form covering: teaching style, areas to teach, years of experience, industries, weekly availability calendar, language preferences, personal values, and supported mentee backgrounds.
2. WHEN the mentor submits the onboarding form THEN the system SHALL validate that teaching style, at least one area to teach, experience, and at least one language are provided.
3. WHEN the mentor opts into verification THEN the system SHALL accept document upload and mark the profile `verification_status = "pending"`.
4. WHEN verification is approved THEN the system SHALL surface a "Verified Mentor" badge on the mentor's swipe card and profile.
5. WHEN a mentor sets weekly availability THEN the system SHALL store windows in the user's local timezone and convert to UTC for storage.

### 4. AI matching and discover queue

**User story:** As any authenticated user with a complete profile, I want to swipe through curated profiles so I can express interest efficiently.

#### Acceptance criteria

1. WHEN the user lands on the Discover screen THEN the system SHALL fetch a queue of candidate profiles ordered by AI match score, descending.
2. WHEN a card is shown THEN the system SHALL display name, role-specific summary (years of experience for mentors; subjects of interest for mentees), match-percentage badge, and skill tags.
3. WHEN the user swipes right OR taps the green check THEN the system SHALL record an interest signal for that candidate.
4. WHEN the user swipes left OR taps the red X THEN the system SHALL record a pass for that candidate AND remove the candidate from the queue.
5. IF both users have signaled interest in each other THEN the system SHALL create a match record and notify both parties.
6. WHEN the queue runs out THEN the system SHALL display an empty state inviting the user to broaden preferences or check back later.
7. WHILE a free-tier mentee has 3 active connections THE system SHALL allow swipe interest but SHALL NOT create new matches until a connection is archived OR the user upgrades to Premium.

### 5. Matches and messaging

**User story:** As a matched user, I want to message my match so we can plan a session.

#### Acceptance criteria

1. WHEN a match is created THEN the system SHALL list it on the Matches screen with the partner's name, match percentage, and last-message preview.
2. WHEN the user opens a match thread THEN the system SHALL load the message history and display AI conversation prompts (e.g., "Share goals", "Ask about industry", "Request portfolio feedback") above the input field if no messages exist yet.
3. WHEN the user sends a message THEN the system SHALL append it to the thread, deliver it to the recipient, and update both users' Matches list previews.
4. WHEN either user proposes a meeting time THEN the system SHALL render a scheduling card linked to the user's availability windows.
5. IF a thread has been silent for 14 days THEN the system SHALL display a re-engagement prompt to the user.

### 6. AI meeting notes

**User story:** As a matched user, I want AI-generated notes after each meeting so I can review action items and next steps.

#### Acceptance criteria

1. WHEN a meeting is marked complete THEN the system SHALL request meeting-note generation from the AI Notes service with the meeting transcript or summary.
2. WHEN notes are returned THEN the system SHALL store them with sections: Discussion Summary, Action Items, Next Meeting Goals, and Shared Resources.
3. WHEN either user views Meeting Notes for a match THEN the system SHALL show a chronological list of past sessions with the date, duration, and summary preview.
4. WHEN a user opens an individual session THEN the system SHALL display all four note sections in full.
5. IF AI note generation fails THEN the system SHALL surface a manual note-entry fallback and retry the generation in the background.

### 7. Profile and plan management

**User story:** As an authenticated user, I want to manage my profile, availability, and plan so my experience reflects current preferences.

#### Acceptance criteria

1. WHEN the user opens Profile THEN the system SHALL display their current skills, career interests, learning style, languages, and plan tier.
2. WHEN the user edits any profile field THEN the system SHALL persist the change AND queue a re-score of their candidate queue.
3. WHEN the user opens Availability THEN the system SHALL show their saved windows AND offer to sync with Google Calendar.
4. WHEN Google Calendar sync is enabled THEN the system SHALL pull busy blocks every 15 minutes AND avoid suggesting those slots in scheduling cards.
5. WHEN the user upgrades to Mentee Premium ($9.99/mo) OR Mentor Pro ($4.99/mo) THEN the system SHALL update the active connection cap (Mentee Premium = unlimited) AND unlock premium features.

### 8. Cross-cutting non-functional requirements

#### Acceptance criteria

1. THE system SHALL meet WCAG 2.1 AA color contrast on all primary CTAs and text.
2. THE system SHALL render the Discover swipe card with a Largest Contentful Paint under 2.5 seconds on a mid-range mobile network.
3. THE system SHALL store user PII encrypted at rest and use TLS 1.2+ in transit.
4. THE system SHALL log all match-creation, message-send, and note-generation events with user IDs but never log message bodies in plaintext to analytics sinks.
5. WHEN the user signs out THEN the system SHALL clear all in-memory and persisted client tokens.
