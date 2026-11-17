import { describe, expect, it } from "vitest";

import { parseSchema } from "../parser";

import { buildDefaultStudioConfig } from "./defaults";

const schemaSource = `
  enum AccountStatus {
    ACTIVE
    SUSPENDED
  }

  model Category {
    id          Int           @id @default(autoincrement())
    displayName String
    status      AccountStatus @default(ACTIVE)
    rating      Float?
    published   Boolean       @default(false)
    launchedAt  DateTime?
    metadata    Json?
    tags        String[]
    ownerId     Int
    owner       User          @relation(fields: [ownerId], references: [id])
    mystery     Unsupported("point")
  }

  model User {
    id         String     @id
    categories Category[]
  }
`;

describe("buildDefaultStudioConfig", () => {
  it("creates defaults for every model with readable labels and all pages", () => {
    const schema = parseSchema(schemaSource);
    const config = buildDefaultStudioConfig(schema);

    expect(Object.keys(config.models)).toEqual(["Category", "User"]);
    expect(config.models.Category.label).toBe("Categories");
    expect(config.models.User.label).toBe("Users");
    expect(config.models.Category.enabledPages).toEqual([
      "list",
      "detail",
      "create",
      "edit",
    ]);
    expect(config.roles).toEqual([]);
  });

  it("uses non-list scalar and enum fields as visible table columns", () => {
    const config = buildDefaultStudioConfig(parseSchema(schemaSource));

    expect(config.models.Category.columns).toEqual([
      { field: "id", label: "ID", visible: true },
      { field: "displayName", label: "Display name", visible: true },
      { field: "status", label: "Status", visible: true },
      { field: "rating", label: "Rating", visible: true },
      { field: "published", label: "Published", visible: true },
      { field: "launchedAt", label: "Launched at", visible: true },
      { field: "metadata", label: "Metadata", visible: true },
      { field: "ownerId", label: "Owner ID", visible: true },
    ]);
  });

  it("chooses suitable inputs and omits generated, list, and unsupported fields", () => {
    const config = buildDefaultStudioConfig(parseSchema(schemaSource));

    expect(config.models.Category.formFields).toEqual([
      { field: "displayName", input: "text" },
      { field: "status", input: "select" },
      { field: "rating", input: "number" },
      { field: "published", input: "checkbox" },
      { field: "launchedAt", input: "date" },
      { field: "metadata", input: "textarea" },
      { field: "owner", input: "select" },
    ]);
    expect(config.models.User.formFields).toEqual([
      { field: "id", input: "text" },
    ]);
  });

  it("is deterministic, does not mutate the parsed schema, and returns fresh config arrays", () => {
    const schema = parseSchema(schemaSource);
    const before = structuredClone(schema);

    const first = buildDefaultStudioConfig(schema);
    const second = buildDefaultStudioConfig(schema);

    expect(schema).toEqual(before);
    expect(first).toEqual(second);
    expect(first.models.Category).not.toBe(second.models.Category);
    expect(first.models.Category.columns).not.toBe(second.models.Category.columns);
    expect(first.models.Category.formFields).not.toBe(
      second.models.Category.formFields,
    );
    expect(first.models.Category.enabledPages).not.toBe(
      second.models.Category.enabledPages,
    );
  });
});
