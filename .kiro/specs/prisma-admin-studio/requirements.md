# Requirements: Prisma Admin Studio

## Introduction
A web studio where a developer uploads a `schema.prisma` file, customizes the look and structure of an admin dashboard, and downloads a complete Next.js project. The download includes Kiro steering and skills so any AI agent can understand and extend the project immediately. Roles can be defined and switched in the generated dashboard.

## Requirements

### 1. Schema import
**User story:** As a developer, I want to upload my Prisma schema so the studio understands my data model.
- 1.1 WHEN a user uploads or pastes a `schema.prisma`, THEN the system SHALL parse models, fields, types, enums, and relations.
- 1.2 IF the schema is invalid, THEN the system SHALL show the exact error and line, and SHALL NOT proceed.
- 1.3 WHEN parsing succeeds, THEN the system SHALL display a summary (model count, field count, relations).

### 2. Studio customization
**User story:** As a developer, I want to customize the dashboard in the studio before generating it.
- 2.1 The system SHALL let the user rename each model and page title.
- 2.2 The system SHALL let the user choose visible columns, order, and label for each model's table.
- 2.3 The system SHALL let the user choose form fields and input types per model.
- 2.4 The system SHALL let the user enable or disable pages (list, detail, create, edit).
- 2.5 The system SHALL show a live preview that updates as the user changes settings.

### 3. Roles and permissions
**User story:** As a developer, I want multiple admin roles so different users see different parts of the dashboard.
- 3.1 The system SHALL let the user define roles (for example Student, Professor, Admin).
- 3.2 For each role and each model, the system SHALL let the user set permissions: view, create, edit, delete.
- 3.3 The system SHALL let the user choose which pages and menu items each role sees.
- 3.4 The generated dashboard SHALL include a role switcher so reviewers can switch roles and see the interface change.
- 3.5 The generated code SHALL enforce permissions on both UI and server actions.

### 4. Code generation
**User story:** As a developer, I want a complete, readable project I can run immediately.
- 4.1 The system SHALL generate a Next.js (App Router, TypeScript) project with CRUD pages for every enabled model.
- 4.2 The generated project SHALL include the original Prisma schema, a seed script, and a README with run instructions.
- 4.3 Generated code SHALL be clean, commented, and organized so a human or agent can modify it easily.
- 4.4 The system SHALL package the project as a downloadable ZIP.

### 5. Kiro integration in the output
**User story:** As a developer, I want my AI agent to understand the generated project right away.
- 5.1 The ZIP SHALL contain a `.kiro/` folder with steering files describing structure, conventions, and the role system.
- 5.2 The ZIP SHALL include Kiro skills for common tasks: add a model, add a field, add a role, change a page layout.
- 5.3 The steering SHALL reflect the user's actual schema and customization, not generic text.

### 6. Demos
- 6.1 The studio SHALL ship with two example schemas to load in one click.
- 6.2 Demo A: University (Student, Course, Professor, Enrollment, Grade) with Student, Professor, and Admin roles.
- 6.3 Demo B: a second domain (store or ticketing) to prove the generator is generic.

### 7. Studio design
- 7.1 The studio SHALL have a professional, polished interface (reference designs to be provided by the user).
- 7.2 The UI text SHALL be in English.
