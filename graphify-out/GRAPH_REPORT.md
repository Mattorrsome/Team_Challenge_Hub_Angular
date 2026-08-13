# Graph Report - C:\Projects\Team_Challenge_Hub_Planning\Team_Challenge_Hub_Angular  (2026-08-13)

## Corpus Check
- 33 files · ~65,569 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 443 nodes · 606 edges · 62 communities (30 shown, 32 thin omitted)
- Extraction: 95% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.84)
- Token cost: 131,409 input · 0 output

## Community Hubs (Navigation)
- Challenge Model & API Service
- Routing & Auth Guards
- Angular Build Configuration
- Auth & Challenge Forms
- Dev Dependencies & Tooling
- Project Specs & Gap Analysis
- Angular Runtime Dependencies
- Problem Statement AI Panel
- Angular Workspace Config
- App Shell & Theme Service
- Delete Confirm & Icon Buttons
- User Model & Admin API
- Author Attribution
- Solution Options Panel Logic
- User Management Component
- Back Navigation & Status Filter
- Ownership & Panel Rules
- Detail Panel Ordering
- Selected Option Icons
- Theme Color Scheme
- List Scoping Architecture
- AI Draft Error Handling
- Scaffold Gap Findings
- Interceptor Exclusion
- Challenge Delete Spec
- User Picker Retirement
- Panel Background Tinting
- Brand Palette
- Challenge Status Flow
- Cross-Repo Assumptions
- Playwright E2E Setup
- Auth Service Design
- Route Guards Design
- User Management Design
- Dark Mode Toggle
- 403 Ownership Branch
- Admin List Unscoping
- E2E Draft Error Check
- Credentials Interceptor
- Aria Label Test Assertions
- Toolbar Styling Docs
- Signed-Out Theme Toggle
- E2E Delete Teardown
- Detail Polish Docs
- Navigation Polish Docs
- Design Token Rules
- Environment Config
- Spec Compression Skill
- Gap Finding F3
- Deferred Finding 2
- Deferred Finding 3
- Deferred Finding 4
- Theme Token Task
- Header Title Task
- Backend Ownership Helper
- Project Readme
- Challenge Service Injectable
- Options Panel Output

## God Nodes (most connected - your core abstractions)
1. `Challenge` - 27 edges
2. `AuthService` - 23 edges
3. `ChallengeApiService` - 19 edges
4. `environment` - 15 edges
5. `ChallengeStatus` - 12 edges
6. `Angular Frontend Design Spec (base spec)` - 11 edges
7. `SolutionOptionsPanelComponent` - 11 edges
8. `ThemeService` - 9 edges
9. `ProblemStatementPanelComponent` - 9 edges
10. `ChallengeFormComponent` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Append-Only Decision Log Pattern` --semantically_similar_to--> `Deferred Review Findings — AI Draft Failure Messaging`  [INFERRED] [semantically similar]
  .claude/skills/compress-spec-plan/SKILL.md → docs/specs/2026-08-06-deferred-review-findings.md
- `Card Title Padding Aligned to mat-card-content` --conceptually_related_to--> `Challenge List Card Author Subtitle`  [AMBIGUOUS]
  docs/superpowers/specs/2026-08-11-detail-panel-and-list-polish-design.md → src/app/features/challenge-list/challenge-list.component.html
- `CLAUDE.md (Repo Guidance)` --references--> `Angular Frontend Design Spec (base spec)`  [EXTRACTED]
  CLAUDE.md → docs/specs/2026-07-27-frontend-design.md
- `AI Draft Endpoints Are Read-Only (Human Review Gate)` --conceptually_related_to--> `AI Draft Failure Messaging — Design Spec`  [INFERRED]
  CLAUDE.md → docs/specs/2026-08-06-ai-draft-error-handling-design.md
- `HTTPS Redirect Breaks Proxied Session Cookie (rationale for http launch profile)` --conceptually_related_to--> `Auth & Roles (Frontend) Implementation Plan`  [INFERRED]
  CLAUDE.md → docs/superpowers/plans/2026-08-04-auth-roles-frontend.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Challenge Delete Flow (Affordance, Confirm, 404, Redirect)** — docs_specs_2026_08_11_challenge_delete_and_author_attribution_frontend_deletechallenge_service_method, docs_specs_2026_08_11_challenge_delete_and_author_attribution_frontend_canedit_ux_affordance, docs_specs_2026_08_11_challenge_delete_and_author_attribution_frontend_native_confirm_guard, docs_specs_2026_08_11_challenge_delete_and_author_attribution_frontend_delete_404_treated_as_success, src_app_features_challenge_detail_challenge_detail_component_delete_button [EXTRACTED 1.00]
- **Author Attribution: One Rule Across Model, Detail, and List** — docs_specs_2026_08_11_challenge_delete_and_author_attribution_frontend_submittedbyname_model_field, docs_specs_2026_08_11_challenge_delete_and_author_attribution_frontend_author_byline_not_yours_rule, docs_superpowers_plans_2026_08_11_challenge_delete_and_author_attribution_authorname_computed, docs_superpowers_plans_2026_08_11_challenge_delete_and_author_attribution_myid_computed, src_app_features_challenge_detail_challenge_detail_component_author_byline, src_app_features_challenge_list_challenge_list_component_card_subtitle_byline [EXTRACTED 1.00]
- **Icon-Only Controls With Accessible Names** — docs_superpowers_specs_2026_08_10_toolbar_and_list_styling_design_icon_only_button_accessibility, docs_superpowers_specs_2026_08_11_navigation_and_icon_polish_design_maticon_aria_hidden_override, src_app_app_component_theme_toggle_button, src_app_features_admin_user_management_user_management_component_delete_icon_button, src_app_features_challenge_detail_solution_options_panel_solution_options_panel_component_select_button, src_app_features_challenge_detail_solution_options_panel_solution_options_panel_component_selected_icon [INFERRED 0.85]
- **2026-08-03 Companion Spec Trio (Auth, Styling, UX)** — docs_specs_2026_08_03_auth_roles_frontend, docs_specs_2026_08_03_styling_theme_update, docs_specs_2026_08_03_ux_behavior_update [EXTRACTED 1.00]
- **Challenge Ownership Enforcement Mechanism (backend gate + canEdit + 403 branch + admin unscope)** — docs_superpowers_plans_2026_08_05_challenge_ownership_backendhelper, docs_specs_2026_08_05_challenge_ownership_frontend_canedit, docs_specs_2026_08_05_challenge_ownership_frontend_403branch, docs_specs_2026_08_05_challenge_ownership_frontend_adminunscope [INFERRED 0.85]
- **AI Draft Failure Messaging Feature (interceptor exclusion + both panels + review finding)** — docs_specs_2026_08_06_ai_draft_error_handling_design_interceptorexclusion, docs_superpowers_plans_2026_08_06_ai_draft_error_messaging_problemstatementpanel, docs_superpowers_plans_2026_08_06_ai_draft_error_messaging_solutionoptionspanel, docs_specs_2026_08_06_deferred_review_findings_finding2 [INFERRED 0.85]
- **Reactive Form + Inline Validation Errors** — src_app_features_auth_sign_in_sign_in_component, src_app_features_auth_sign_up_sign_up_component, src_app_features_challenge_form_challenge_form_component, concept_reactive_form_error_display [INFERRED 0.85]
- **Editable AI Draft with Explicit Accept & Save** — src_app_features_challenge_detail_problem_statement_panel_problem_statement_panel_component, src_app_features_challenge_detail_solution_options_panel_solution_options_panel_component, concept_ai_draft_accept_save [INFERRED 0.85]

## Communities (62 total, 32 thin omitted)

### Community 0 - "Challenge Model & API Service"
Cohesion: 0.07
Nodes (29): Injectable, Challenge, ChallengeStatus, CreateChallengeRequest, DraftProblemStatementResponse, DraftSolutionOptionsResponse, STATUS_LABELS, UpdateChallengeRequest (+21 more)

### Community 1 - "Routing & Auth Guards"
Cohesion: 0.12
Nodes (11): DummyComponent, Component, routes, adminGuard(), authGuard(), AuthService, Injectable, AuthUser (+3 more)

### Community 2 - "Angular Build Configuration"
Cohesion: 0.06
Nodes (33): build, serve, test, builder, configurations, defaultConfiguration, options, development (+25 more)

### Community 3 - "Auth & Challenge Forms"
Cohesion: 0.07
Nodes (14): Reactive Form with Inline Field Errors, SignInComponent.form, SignInComponent, Component, SignUpComponent.form, SignUpComponent, Component, ValidationProblemDetails (+6 more)

### Community 4 - "Dev Dependencies & Tooling"
Cohesion: 0.07
Nodes (28): @angular/build, @angular/compiler-cli, jsdom, devDependencies, @angular/build, @angular/cli, @angular/compiler-cli, jsdom (+20 more)

### Community 5 - "Project Specs & Gap Analysis"
Cohesion: 0.13
Nodes (23): Append-Only Decision Log Pattern, CLAUDE.md (Repo Guidance), AI Draft Endpoints Are Read-Only (Human Review Gate), HTTPS Redirect Breaks Proxied Session Cookie (rationale for http launch profile), Gap Analysis — Team Challenge Hub Angular, F4: Detail View Spins Forever on Load Failure, F5: Status Stepper Is a Static Legend, F6: Test Runner Deviates From Spec (Vitest vs Jasmine/Karma) (+15 more)

### Community 6 - "Angular Runtime Dependencies"
Cohesion: 0.10
Nodes (21): @angular/cdk, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/material, @angular/platform-browser, @angular/router (+13 more)

### Community 7 - "Problem Statement AI Panel"
Cohesion: 0.12
Nodes (6): Editable AI Draft + Accept & Save Pattern, ProblemStatementPanelComponent.challenge (Input), ProblemStatementPanelComponent, Component, Input, Output

### Community 8 - "Angular Workspace Config"
Cohesion: 0.12
Nodes (15): analytics, packageManager, cli, newProjectRoot, projects, team-challenge-hub-angular, $schema, style (+7 more)

### Community 9 - "App Shell & Theme Service"
Cohesion: 0.17
Nodes (6): AppComponent, Component, appConfig, Theme, ThemeService, Injectable

### Community 10 - "Delete Confirm & Icon Buttons"
Cohesion: 0.15
Nodes (15): canEdit as UX Affordance, Not Security Boundary, 404 on Delete Treated as Success, Native confirm() as the Sole Delete Guard, errorHandlingInterceptor Owns 409 Snackbar, No Inline Handling, Suite-Wide window.confirm Stub for Existing Delete Tests, Icon-Only Buttons Require aria-label and matTooltip, Toolbar Order: Title, Spacer, Username, Toggle, Users, Sign Out, Re-Selection Widened, API Remains Source of Truth (+7 more)

### Community 11 - "User Model & Admin API"
Cohesion: 0.33
Nodes (5): UserRole, User, Injectable, UserApiService, ROLES

### Community 12 - "Author Attribution"
Cohesion: 0.28
Nodes (9): Author Byline Shown Only When Challenge Is Not Yours, Hand-Synced DTO Contract (No Shared Package), Challenge.submittedByName Model Field, authorName Computed on ChallengeDetailComponent, myId Computed on ChallengeListComponent, Required Model Field as Fixture Tripwire, Card Title Padding Aligned to mat-card-content, Challenge Detail Author Byline (+1 more)

### Community 13 - "Solution Options Panel Logic"
Cohesion: 0.25
Nodes (4): Output, SolutionOptionsPanelComponent, Component, Input

### Community 15 - "Back Navigation & Status Filter"
Cohesion: 0.33
Nodes (5): cdk-overlay-container Cleanup Between Tests, showBack Computed Over the Current URL, STATUS_LABELS Shared Display-Text Map, app-back Back Bar Block, Challenge List Status Filter Select

### Community 16 - "Ownership & Panel Rules"
Cohesion: 0.50
Nodes (5): Challenge Ownership Rule (Owner-or-Admin), One-Step-Visible-At-A-Time Panel Rule, canEdit Computed Rule (Owner-or-Admin), currentPanel Computed Signal (Task 4), canEdit Implementation (Task 4)

### Community 17 - "Detail Panel Ordering"
Cohesion: 0.40
Nodes (5): Template-Order Assertion via Control-Flow Comment Anchors, Drafting UI Hidden Once an Option Is Selected, Status Stepper Positioned Above Notes, Challenge Detail currentPanel Switch, Solution Options Drafting Block

### Community 18 - "Selected Option Icons"
Cohesion: 0.40
Nodes (5): Selected Option Shown During InReview, Select/Selected Differ by Glyph Shape, Not Fill, MatIcon Forces aria-hidden="true" Unless Overridden, Challenge Detail InReview Selected-Option Section, Solution Option Selected check_circle Icon

### Community 19 - "Theme Color Scheme"
Cohesion: 0.50
Nodes (4): team-challenge-colors Skill, color-scheme / light-dark() Theming Mechanism, theme-type: color-scheme Mechanism Ruling, Task 1: Theming Foundation (Brand Palette, color-scheme, Color Skill)

### Community 20 - "List Scoping Architecture"
Cohesion: 0.50
Nodes (4): Feature-Folder Standalone-Component Architecture, Challenge List Scoped to Current User, ChallengeApiService (Task 6, initial getChallenges), httpResource-Based List Scoping Decision (Task 2)

### Community 21 - "AI Draft Error Handling"
Cohesion: 0.50
Nodes (4): draftError Signal Pattern, Finding 1: challenge-form Missing Live Region, ProblemStatementPanelComponent draftError (Task 2), SolutionOptionsPanelComponent draftError (Task 3)

### Community 22 - "Scaffold Gap Findings"
Cohesion: 0.67
Nodes (3): F2: Dev Proxy Points at Wrong Port, F7: Plan Checkboxes Never Updated, Post-Plan Follow-Up Items

### Community 23 - "Interceptor Exclusion"
Cohesion: 0.67
Nodes (3): Interceptor /draft- Exclusion Design, Finding 5: Settled Rulings (Duplication Kept, Substring Check Kept), Interceptor Exclusion Implementation (Task 1)

### Community 24 - "Challenge Delete Spec"
Cohesion: 0.67
Nodes (3): deleteChallenge on ChallengeApiService, Challenge Delete & Author Attribution (Frontend) Spec, Challenge Delete & Author Attribution Implementation Plan

### Community 25 - "User Picker Retirement"
Cohesion: 0.67
Nodes (3): UserContextService (Task 3), UserPickerComponent (Task 7), Task 5: Retire the User Picker and User Context

### Community 26 - "Panel Background Tinting"
Cohesion: 0.67
Nodes (3): No Unit Tests for Style-Only Changes (jsdom), Challenge-List Panel Backgrounds, Secondary-Container Tint for List Panels

## Ambiguous Edges - Review These
- `Card Title Padding Aligned to mat-card-content` → `Challenge List Card Author Subtitle`  [AMBIGUOUS]
  docs/superpowers/specs/2026-08-11-detail-panel-and-list-polish-design.md · relation: conceptually_related_to
- `app-back Back Bar Block` → `Challenge List Status Filter Select`  [AMBIGUOUS]
  src/app/app.component.html · relation: conceptually_related_to

## Knowledge Gaps
- **137 isolated node(s):** `$schema`, `version`, `packageManager`, `analytics`, `newProjectRoot` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Card Title Padding Aligned to mat-card-content` and `Challenge List Card Author Subtitle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `app-back Back Bar Block` and `Challenge List Status Filter Select`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `AuthService` connect `Routing & Auth Guards` to `Challenge Model & API Service`, `App Shell & Theme Service`, `Auth & Challenge Forms`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Challenge` connect `Challenge Model & API Service` to `Routing & Auth Guards`, `Auth & Challenge Forms`, `Solution Options Panel Logic`, `Problem Statement AI Panel`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `environment` connect `Routing & Auth Guards` to `Challenge Model & API Service`, `User Model & Admin API`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `$schema`, `version`, `packageManager` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Challenge Model & API Service` be split into smaller, more focused modules?**
  _Cohesion score 0.06610259122157588 - nodes in this community are weakly interconnected._