import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { normalizeZipPath, packageProject } from "./packager";

describe("packageProject", () => {
  it("round-trips paths and contents", async () => {
    const files = [
      { path: "package.json", content: '{"name":"x"}' },
      { path: "app/page.tsx", content: "export default () => <p>héllo ✓</p>;\n" },
      { path: "empty.txt", content: "" },
    ];

    const zip = await JSZip.loadAsync(await packageProject(files));
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

    expect(names.sort()).toEqual(files.map((f) => f.path).sort());
    for (const f of files) {
      expect(await zip.file(f.path)!.async("string")).toBe(f.content);
    }
  });

  it("produces a valid empty ZIP for an empty list", async () => {
    const bytes = await packageProject([]);
    const zip = await JSZip.loadAsync(bytes);

    expect(Object.keys(zip.files)).toHaveLength(0);
  });

  it("is deterministic", async () => {
    const files = [{ path: "a.txt", content: "a" }];

    expect(await packageProject(files)).toEqual(await packageProject(files));
  });

  it("rejects unsafe and duplicate paths", async () => {
    await expect(packageProject([{ path: "../evil.txt", content: "" }])).rejects.toThrow();
    await expect(packageProject([{ path: "a/../../evil", content: "" }])).rejects.toThrow();
    await expect(packageProject([{ path: "/etc/passwd", content: "" }])).rejects.toThrow();
    await expect(packageProject([{ path: "C:\\x.txt", content: "" }])).rejects.toThrow();
    await expect(
      packageProject([
        { path: "a.txt", content: "1" },
        { path: "./a.txt", content: "2" },
      ]),
    ).rejects.toThrow(/Duplicate/);
  });
});

describe("normalizeZipPath", () => {
  it("normalizes separators and redundant segments", () => {
    expect(normalizeZipPath("./app\\lib//x.ts")).toBe("app/lib/x.ts");
  });

  it("rejects empty paths", () => {
    expect(() => normalizeZipPath("")).toThrow();
    expect(() => normalizeZipPath("./")).toThrow();
  });
});
