# Implementation Plan

- [x] 1. Project setup
  - Create Next.js + TypeScript + Tailwind + shadcn/ui project
  - Add `.kiro/steering/` files (product, tech, structure) for the studio itself
  - _Requirements: 7_

- [x] 2. Schema parser
  - [x] 2.1 Integrate `@mrleebo/prisma-ast` and map output to `SchemaModel`
  - [x] 2.2 Error reporting with line and message
  - [x] 2.3 Unit tests with valid and invalid fixtures
  - _Requirements: 1_

- [x] 3. Studio state and config
  - [x] 3.1 Define `StudioConfig` types and a Zustand store
  - [x] 3.2 Build default config from a parsed schema (all models, sensible columns and form inputs)
  - _Requirements: 2_

- [x] 4. Generator core
  - [x] 4.1 Project skeleton template (layout, sidebar, Prisma setup, SQLite)
  - [x] 4.2 List page and table template
  - [x] 4.3 Create, edit, and detail page templates plus server actions
  - [x] 4.4 Seed script template
  - [x] 4.5 Packager (ZIP)
  - _Requirements: 4_

- [x] 5. Roles and permissions
  - [x] 5.1 `lib/roles.ts` and `can()` helper templates
  - [x] 5.2 Role switcher component template
  - [x] 5.3 Permission checks in UI and server actions
  - [x] 5.4 Tests: restricted role cannot perform blocked actions
  - _Requirements: 3_

- [x] 6. Kiro output generation
  - [x] 6.1 Steering generator from real config
  - [x] 6.2 Skills: add-model, add-field, add-role, edit-page-layout
  - _Requirements: 5_

- [ ] 7. Studio UI
  - [ ] 7.1 Import screen with demo loader
  - [ ] 7.2 Models customization screen
  - [ ] 7.3 Roles permission matrix
  - [ ] 7.4 Live preview with role switcher
  - [ ] 7.5 Export screen and download
  - _Requirements: 1, 2, 3, 7_

- [ ] 8. Demos
  - [ ] 8.1 University schema and roles (Student, Professor, Admin)
  - [ ] 8.2 Second schema (store or ticketing)
  - [ ] 8.3 Verify both generated projects build and run
  - _Requirements: 6_

- [ ] 9. Polish and submission
  - [ ] 9.1 Apply final studio design from references
  - [ ] 9.2 README, demo video script, Devpost write-up covering how Kiro was used (specs, steering, hooks)

---

# Steering file: `.kiro/steering/product.md`

## Product
Prisma Admin Studio turns a Prisma schema into a complete, customizable Next.js admin dashboard with role-based access, delivered as a downloadable project that includes Kiro steering and skills.

## Principles
- The generator is made of pure functions: config in, files out.
- Generated code must be readable, commented, and easy for an agent to modify.
- One source of truth for roles and permissions in generated projects (`lib/roles.ts`).
- All UI text in English.
