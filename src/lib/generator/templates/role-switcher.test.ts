import { describe, expect, it } from "vitest";

import { parseSchema } from "../../parser";
import { buildDefaultStudioConfig } from "../../studio-config";
import { generateProject } from "../project";
import { roleSwitcherTemplate, roleTopBarTemplate } from "./role-switcher";
import { ROLE_COOKIE_NAME } from "./roles";

const config = buildDefaultStudioConfig(parseSchema(`
  model Student {
    id Int @id @default(autoincrement())
  }
`));

describe("roleSwitcherTemplate", () => {
  const out = roleSwitcherTemplate();

  it("is deterministic and a client component", () => {
    expect(roleSwitcherTemplate()).toBe(out);
    expect(out.startsWith('"use client";')).toBe(true);
  });

  it("reads roles and the cookie name from lib/roles.ts instead of hardcoding them", () => {
    expect(out).toContain('import { ROLE_COOKIE, roles } from "@/lib/roles";');
    expect(out).not.toContain(ROLE_COOKIE_NAME);
    expect(out).toContain("document.cookie = `${ROLE_COOKIE}=");
    expect(out).toContain("router.refresh()");
  });

  it("uses a line icon and no emojis", () => {
    expect(out).toContain('stroke="currentColor"');
    expect(out).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("roleTopBarTemplate", () => {
  const out = roleTopBarTemplate();

  it("reads the role cookie on the server and falls back to the first role", () => {
    expect(out).toContain("await cookies()");
    expect(out).toContain("cookieStore.get(ROLE_COOKIE)");
    expect(out).toContain("?? roles[0]");
    expect(out).toContain("<RoleSwitcher activeRole={activeRole.name} />");
  });
});

describe("project wiring", () => {
  const files = generateProject(config);

  it("adds the role switcher and replaces the placeholder top bar once", () => {
    expect(files.find((f) => f.path === "components/role-switcher.tsx")?.content).toBe(roleSwitcherTemplate());
    const topBars = files.filter((f) => f.path === "components/top-bar.tsx");
    expect(topBars).toHaveLength(1);
    expect(topBars[0].content).toBe(roleTopBarTemplate());
  });

  it("has no duplicate paths", () => {
    const paths = files.map((f) => f.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
