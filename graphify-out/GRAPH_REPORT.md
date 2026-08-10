# Graph Report - .  (2026-08-08)

## Corpus Check
- Corpus is ~46,993 words - fits in a single context window. You may not need a graph.

## Summary
- 405 nodes · 588 edges · 51 communities (27 shown, 24 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.81)
- Token cost: 0 input · 325,732 output

## Community Hubs (Navigation)
- Core Auth & App Bootstrap
- Angular Build Config
- Reactive Form Error Display
- NPM Dev Dependencies
- Docs & Specs Overview
- User Management & Admin
- NPM Runtime Dependencies
- Challenge List & Status Badge
- Angular CLI Project Config
- Theme Service & App Component
- Challenge API Service
- Challenge Models & DTOs
- Challenge Detail Component
- Status Stepper Component
- Problem Statement Panel (Draft)
- Solution Options Panel (Draft)
- Solution Options Panel Component
- Problem Statement Panel Component
- canEdit / currentPanel Ownership
- Color Scheme & Palette
- Challenge List Scoping
- AI Draft Error Messaging
- Post-Plan Follow-Up Gaps
- AI Draft Interceptor Exclusion
- Retired User Picker Component
- Palette Reference
- Status Flow Documentation
- Cross-Repo Assumptions
- Playwright E2E Coverage
- AuthService Spec Cross-Ref
- Guards Spec Cross-Ref
- User Management Spec Cross-Ref
- Dark Mode Toggle Plan
- 403 Ownership Branch
- Admin Unscope / Admin List
- AI Draft E2E Check
- Credentials Interceptor Plan
- Development Environment Config
- Compress-Spec-Plan Skill
- Gap Analysis F3
- Deferred Review Finding 2
- Deferred Review Finding 3
- Deferred Review Finding 4
- Design Tokens Task
- Header Title Task
- Backend Ownership Helper
- README

## God Nodes (most connected - your core abstractions)
1. `Challenge` - 27 edges
2. `AuthService` - 23 edges
3. `ChallengeApiService` - 18 edges
4. `environment` - 15 edges
5. `ChallengeStatus` - 12 edges
6. `SolutionOptionsPanelComponent` - 11 edges
7. `Angular Frontend Design Spec (base spec)` - 11 edges
8. `ThemeService` - 9 edges
9. `ProblemStatementPanelComponent` - 9 edges
10. `UserRole` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Append-Only Decision Log Pattern` --semantically_similar_to--> `Deferred Review Findings — AI Draft Failure Messaging`  [INFERRED] [semantically similar]
  .claude/skills/compress-spec-plan/SKILL.md → docs/specs/2026-08-06-deferred-review-findings.md
- `CLAUDE.md (Repo Guidance)` --references--> `Angular Frontend Design Spec (base spec)`  [EXTRACTED]
  CLAUDE.md → docs/specs/2026-07-27-frontend-design.md
- `AI Draft Endpoints Are Read-Only (Human Review Gate)` --conceptually_related_to--> `AI Draft Failure Messaging — Design Spec`  [INFERRED]
  CLAUDE.md → docs/specs/2026-08-06-ai-draft-error-handling-design.md
- `HTTPS Redirect Breaks Proxied Session Cookie (rationale for http launch profile)` --conceptually_related_to--> `Auth & Roles (Frontend) Implementation Plan`  [INFERRED]
  CLAUDE.md → docs/superpowers/plans/2026-08-04-auth-roles-frontend.md
- `F6: Test Runner Deviates From Spec (Vitest vs Jasmine/Karma)` --references--> `CLAUDE.md (Repo Guidance)`  [EXTRACTED]
  docs/2026-07-31-gap-analysis.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **2026-08-03 Companion Spec Trio (Auth, Styling, UX)** — docs_specs_2026_08_03_auth_roles_frontend, docs_specs_2026_08_03_styling_theme_update, docs_specs_2026_08_03_ux_behavior_update [EXTRACTED 1.00]
- **Challenge Ownership Enforcement Mechanism (backend gate + canEdit + 403 branch + admin unscope)** — docs_superpowers_plans_2026_08_05_challenge_ownership_backendhelper, docs_specs_2026_08_05_challenge_ownership_frontend_canedit, docs_specs_2026_08_05_challenge_ownership_frontend_403branch, docs_specs_2026_08_05_challenge_ownership_frontend_adminunscope [INFERRED 0.85]
- **AI Draft Failure Messaging Feature (interceptor exclusion + both panels + review finding)** — docs_specs_2026_08_06_ai_draft_error_handling_design_interceptorexclusion, docs_superpowers_plans_2026_08_06_ai_draft_error_messaging_problemstatementpanel, docs_superpowers_plans_2026_08_06_ai_draft_error_messaging_solutionoptionspanel, docs_specs_2026_08_06_deferred_review_findings_finding2 [INFERRED 0.85]
- **Reactive Form + Inline Validation Errors** — src_app_features_auth_sign_in_sign_in_component, src_app_features_auth_sign_up_sign_up_component, src_app_features_challenge_form_challenge_form_component, concept_reactive_form_error_display [INFERRED 0.85]
- **Editable AI Draft with Explicit Accept & Save** — src_app_features_challenge_detail_problem_statement_panel_problem_statement_panel_component, src_app_features_challenge_detail_solution_options_panel_solution_options_panel_component, concept_ai_draft_accept_save [INFERRED 0.85]
- **Shared Status Badge Rendering** — src_app_features_challenge_detail_challenge_detail_component, src_app_features_challenge_detail_status_stepper_status_stepper_component, src_app_features_challenge_list_challenge_list_component, src_app_shared_status_badge_status_badge_component [INFERRED 0.85]

## Communities (51 total, 24 thin omitted)

### Community 0 - "Core Auth & App Bootstrap"
Cohesion: 0.10
Nodes (14): AppComponent, DummyComponent, Component, Component, appConfig, routes, adminGuard(), authGuard() (+6 more)

### Community 1 - "Angular Build Config"
Cohesion: 0.06
Nodes (33): build, serve, test, builder, configurations, defaultConfiguration, options, development (+25 more)

### Community 2 - "Reactive Form Error Display"
Cohesion: 0.07
Nodes (14): Reactive Form with Inline Field Errors, SignInComponent.form, SignInComponent, Component, SignUpComponent.form, SignUpComponent, Component, ValidationProblemDetails (+6 more)

### Community 3 - "NPM Dev Dependencies"
Cohesion: 0.07
Nodes (28): @angular/build, @angular/compiler-cli, jsdom, devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, jsdom (+20 more)

### Community 4 - "Docs & Specs Overview"
Cohesion: 0.13
Nodes (23): Append-Only Decision Log Pattern, CLAUDE.md (Repo Guidance), AI Draft Endpoints Are Read-Only (Human Review Gate), HTTPS Redirect Breaks Proxied Session Cookie (rationale for http launch profile), Gap Analysis — Team Challenge Hub Angular, F4: Detail View Spins Forever on Load Failure, F5: Status Stepper Is a Static Legend, F6: Test Runner Deviates From Spec (Vitest vs Jasmine/Karma) (+15 more)

### Community 5 - "User Management & Admin"
Cohesion: 0.18
Nodes (7): UserRole, User, Injectable, UserApiService, ROLES, Component, UserManagementComponent

### Community 6 - "NPM Runtime Dependencies"
Cohesion: 0.10
Nodes (21): @angular/cdk, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/material, @angular/platform-browser, @angular/router (+13 more)

### Community 7 - "Challenge List & Status Badge"
Cohesion: 0.11
Nodes (9): ALL_STATUSES, ChallengeListComponent, ChallengeListComponent.statuses, Component, CSS_CLASSES, LABELS, StatusBadgeComponent, Component (+1 more)

### Community 8 - "Angular CLI Project Config"
Cohesion: 0.12
Nodes (15): analytics, packageManager, cli, newProjectRoot, projects, team-challenge-hub-angular, $schema, style (+7 more)

### Community 9 - "Theme Service & App Component"
Cohesion: 0.19
Nodes (5): AuthService.currentUser signal, AuthService.isAdmin signal, Theme, ThemeService, Injectable

### Community 10 - "Challenge API Service"
Cohesion: 0.21
Nodes (5): Challenge, ChallengeApiService, HostComponent, Component, Injectable

### Community 11 - "Challenge Models & DTOs"
Cohesion: 0.30
Nodes (7): ChallengeStatus, CreateChallengeRequest, DraftProblemStatementResponse, DraftSolutionOptionsResponse, UpdateChallengeRequest, SolutionOption, ChallengeFilters

### Community 12 - "Challenge Detail Component"
Cohesion: 0.18
Nodes (3): ChallengeDetailComponent, DetailPanel, Component

### Community 13 - "Status Stepper Component"
Cohesion: 0.20
Nodes (6): StatusStepperComponent.challenge (Input), StatusStepperComponent, STEP_ORDER, Component, Input, Output

### Community 16 - "Solution Options Panel Component"
Cohesion: 0.22
Nodes (4): SolutionOptionsPanelComponent, Component, Input, Output

### Community 17 - "Problem Statement Panel Component"
Cohesion: 0.25
Nodes (4): ProblemStatementPanelComponent, Component, Input, Output

### Community 18 - "canEdit / currentPanel Ownership"
Cohesion: 0.50
Nodes (5): Challenge Ownership Rule (Owner-or-Admin), One-Step-Visible-At-A-Time Panel Rule, canEdit Computed Rule (Owner-or-Admin), currentPanel Computed Signal (Task 4), canEdit Implementation (Task 4)

### Community 19 - "Color Scheme & Palette"
Cohesion: 0.50
Nodes (4): team-challenge-colors Skill, color-scheme / light-dark() Theming Mechanism, theme-type: color-scheme Mechanism Ruling, Task 1: Theming Foundation (Brand Palette, color-scheme, Color Skill)

### Community 20 - "Challenge List Scoping"
Cohesion: 0.50
Nodes (4): Feature-Folder Standalone-Component Architecture, Challenge List Scoped to Current User, ChallengeApiService (Task 6, initial getChallenges), httpResource-Based List Scoping Decision (Task 2)

### Community 21 - "AI Draft Error Messaging"
Cohesion: 0.50
Nodes (4): draftError Signal Pattern, Finding 1: challenge-form Missing Live Region, ProblemStatementPanelComponent draftError (Task 2), SolutionOptionsPanelComponent draftError (Task 3)

### Community 22 - "Post-Plan Follow-Up Gaps"
Cohesion: 0.67
Nodes (3): F2: Dev Proxy Points at Wrong Port, F7: Plan Checkboxes Never Updated, Post-Plan Follow-Up Items

### Community 23 - "AI Draft Interceptor Exclusion"
Cohesion: 0.67
Nodes (3): Interceptor /draft- Exclusion Design, Finding 5: Settled Rulings (Duplication Kept, Substring Check Kept), Interceptor Exclusion Implementation (Task 1)

### Community 24 - "Retired User Picker Component"
Cohesion: 0.67
Nodes (3): UserContextService (Task 3), UserPickerComponent (Task 7), Task 5: Retire the User Picker and User Context

## Knowledge Gaps
- **128 isolated node(s):** `$schema`, `version`, `packageManager`, `analytics`, `newProjectRoot` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthService` connect `Core Auth & App Bootstrap` to `Theme Service & App Component`, `Reactive Form Error Display`, `Challenge Detail Component`, `Challenge List & Status Badge`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Challenge` connect `Challenge API Service` to `Core Auth & App Bootstrap`, `Reactive Form Error Display`, `Challenge List & Status Badge`, `Challenge Models & DTOs`, `Challenge Detail Component`, `Status Stepper Component`, `Problem Statement Panel (Draft)`, `Solution Options Panel (Draft)`, `Solution Options Panel Component`, `Problem Statement Panel Component`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `ChallengeApiService` connect `Challenge API Service` to `Reactive Form Error Display`, `Challenge List & Status Badge`, `Challenge Models & DTOs`, `Challenge Detail Component`, `Status Stepper Component`, `Problem Statement Panel (Draft)`, `Solution Options Panel (Draft)`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `packageManager` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Auth & App Bootstrap` be split into smaller, more focused modules?**
  _Cohesion score 0.09966777408637874 - nodes in this community are weakly interconnected._
- **Should `Angular Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06439393939393939 - nodes in this community are weakly interconnected._
- **Should `Reactive Form Error Display` be split into smaller, more focused modules?**
  _Cohesion score 0.07311827956989247 - nodes in this community are weakly interconnected._