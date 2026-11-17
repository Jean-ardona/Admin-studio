import { describe, expect, it } from "vitest";

import { createStudioStore } from "./store";
import type { StudioConfig } from "./types";

const config: StudioConfig = {
  schema: {
    models: [{ name: "User", fields: [] }],
    enums: [],
  },
  models: {
    User: {
      label: "Users",
      enabledPages: ["list", "detail"],
      columns: [{ field: "id", label: "ID", visible: true }],
      formFields: [{ field: "name", input: "text" }],
    },
  },
  roles: [
    {
      name: "Admin",
      permissions: {
        User: { view: true, create: true, edit: true, delete: true },
      },
      menu: ["User"],
    },
  ],
};

describe("createStudioStore", () => {
  it("sets and clears the complete Studio config", () => {
    const store = createStudioStore();

    expect(store.getState().config).toBeNull();
    store.getState().setConfig(config);
    expect(store.getState().config).toBe(config);
    store.getState().clearConfig();
    expect(store.getState().config).toBeNull();
  });

  it("updates existing config without coupling consumers to the store", () => {
    const store = createStudioStore(config);

    store.getState().updateConfig((current) => ({
      ...current,
      models: {
        ...current.models,
        User: { ...current.models.User, label: "Team members" },
      },
    }));

    expect(store.getState().config?.models.User.label).toBe("Team members");
    expect(config.models.User.label).toBe("Users");
  });

  it("ignores updates until a config has been loaded", () => {
    const store = createStudioStore();
    let called = false;

    store.getState().updateConfig((current) => {
      called = true;
      return current;
    });

    expect(called).toBe(false);
    expect(store.getState().config).toBeNull();
  });
});