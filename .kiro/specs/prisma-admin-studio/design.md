# Design: Prisma Admin Studio

## Overview
Two parts: the **Studio** (the app the user sees) and the **Generator** (pure functions that turn a schema plus config into project files). Keeping the generator pure makes it testable and lets the live preview reuse it.

## Stack
- Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui
- `@mrleebo/prisma-ast` for schema parsing (runs in the browser)
- `jszip` for packaging the download
- Zustand for studio state
- Generated project: Next.js, Prisma, SQLite (zero setup), Tailwind

## Architecture
```
Upload schema.prisma
   -> Parser            (schema text -> SchemaModel)
   -> Studio config     (SchemaModel + user choices -> StudioConfig)
   -> Generator         (StudioConfig -> list of { path, content })
   -> Packager          (files -> ZIP)
```

## Core data types
```ts
type SchemaModel = {
  models: { name: string; fields: Field[] }[];
  enums: { name: string; values: string[] }[];
};

type StudioConfig = {
  schema: SchemaModel;
  models: Record<string, {
    label: string;
    enabledPages: ("list" | "detail" | "create" | "edit")[];
    columns: { field: string; label: string; visible: boolean }[];
    formFields: { field: string; input: "text" | "number" | "select" | "date" | "checkbox" | "textarea" }[];
  }>;
  roles: {
    name: string;
    permissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>;
    menu: string[];
  }[];
};
```

## Generator modules
- `generateProject(config)`: returns the full file list
- `templates/`: one template per file kind (layout, sidebar, table page, form page, detail page, actions, permissions helper, role switcher, seed script)
- `generateKiro(config)`: builds `.kiro/steering/*.md` and `.kiro/skills/*` from the real config

## Role system (generated project)
- `lib/roles.ts` holds the role definitions and permission map as one source of truth.
- A role switcher in the top bar stores the active role in a cookie.
- `can(role, model, action)` is used by UI components (hide buttons and menu items) and by every server action (reject unauthorized calls).
- The README states that the switcher is a demo mechanism and explains how to plug in real auth.

## Studio screens
1. **Import**: drop zone, schema paste area, demo loader
2. **Models**: list of models with fields; configure labels, columns, form fields, pages
3. **Roles**: role list and a permission matrix (roles x models x actions)
4. **Preview**: live dashboard preview with the role switcher
5. **Export**: file tree preview, download ZIP

## Generated Kiro content
- Steering: `product.md`, `structure.md`, `roles.md`, `conventions.md`
- Skills: add-model, add-field, add-role, edit-page-layout

## Error handling
- Parser errors show line and message; the studio never advances on an invalid schema.
- Unsupported Prisma features (for example composite types) produce a warning listing what was skipped.

## Testing
- Unit tests for parser output and each template on small fixtures.
- Snapshot test: both demo schemas generate a project that passes `tsc` and `next build`.
