import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseSchema, SchemaParseError } from "./index";

const fixture = (name: string): string =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const captureParse = (source: string) => {
  let result: ReturnType<typeof parseSchema> | undefined;
  let error: unknown;

  try {
    result = parseSchema(source);
  } catch (caught) {
    error = caught;
  }

  return { result, error };
};

describe("parseSchema fixtures", () => {
  it("parses models, fields, types, enums, and relations from a valid schema", () => {
    const parsed = parseSchema(fixture("valid-blog.prisma"));

    expect(parsed.enums).toEqual([
      { name: "Role", values: ["USER", "ADMIN"] },
    ]);
    expect(parsed.models.map(({ name }) => name)).toEqual(["User", "Post"]);

    const user = parsed.models.find(({ name }) => name === "User");
    expect(user?.fields).toContainEqual({
      name: "displayName",
      type: "String",
      kind: "scalar",
      isList: false,
      isOptional: true,
      isId: false,
      isUnique: false,
      hasDefault: false,
      relation: undefined,
    });
    expect(user?.fields).toContainEqual(
      expect.objectContaining({
        name: "role",
        type: "Role",
        kind: "enum",
        hasDefault: true,
      }),
    );

    const post = parsed.models.find(({ name }) => name === "Post");
    expect(post?.fields).toContainEqual(
      expect.objectContaining({
        name: "tags",
        type: "String",
        kind: "scalar",
        isList: true,
      }),
    );
    expect(post?.fields).toContainEqual(
      expect.objectContaining({
        name: "author",
        type: "User",
        kind: "relation",
        relation: {
          model: "User",
          name: undefined,
          fields: ["authorId"],
          references: ["id"],
          onDelete: "Cascade",
          onUpdate: "Restrict",
        },
      }),
    );
  });

  it("reports the exact parser detail and line without returning a result", () => {
    const { result, error } = captureParse(
      fixture("invalid-missing-field-type.prisma"),
    );

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(SchemaParseError);
    expect(error).toMatchObject({
      line: 9,
      message: expect.stringMatching(
        /^Expecting: one of these possible Token sequences:/,
      ),
    });
    expect((error as SchemaParseError).message).toContain(
      "but found: 'orphanedField'",
    );
  });

  it("reports the end-of-file line and prevents success for an unclosed model", () => {
    const { result, error } = captureParse(
      fixture("invalid-unclosed-model.prisma"),
    );

    expect(result).toBeUndefined();
    expect(error).toEqual(
      expect.objectContaining({
        name: "SchemaParseError",
        line: 3,
        message: "Expecting --> '}' <-- but found --> '' <--",
      }),
    );
  });
});
