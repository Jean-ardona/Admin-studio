import type { StudioConfig, StudioRole } from "@/lib/studio-config";

/** Cookie that stores the active role name in the generated project. */
export const ROLE_COOKIE_NAME = "admin-role";

const ACTIONS = ["view", "create", "edit", "delete"] as const;

/** Quoted string literal, safe for any role or model name. */
const str = (value: string): string => JSON.stringify(value);

/** Property key: bare when it is a valid identifier, quoted otherwise. */
const key = (name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : str(name));

/** Source of one role's permission map. Every model gets all four actions, missing ones are false. */
const permissionsSource = (role: StudioRole, models: string[]): string => {
  if (models.length === 0) return "{}";
  const rows = models.map((model) => {
    const p = role.permissions[model];
    const flags = ACTIONS.map((a) => `${a}: ${p?.[a] === true}`).join(", ");
    return `      ${key(model)}: { ${flags} },`;
  });
  return `{\n${rows.join("\n")}\n    }`;
};

/** Source of one role object. Menu entries that are not schema models are dropped. */
const roleSource = (role: StudioRole, models: string[]): string => {
  const menu = role.menu.filter((m) => models.includes(m)).map(str).join(", ");
  return `  {
    name: ${str(role.name)},
    // What this role may do on each model.
    permissions: ${permissionsSource(role, models)},
    // Models shown in the sidebar for this role.
    menu: [${menu}],
  },`;
};

/**
 * lib/roles.ts of the generated project: the single source of truth for roles,
 * their permissions and their menu, plus the `can()` helper used by the UI
 * and by server actions.
 * Pure: the same config always produces the same output.
 */
export const rolesTemplate = (config: StudioConfig): string => {
  const models = config.schema.models.map((m) => m.name);
  const modelUnion = models.length > 0 ? models.map(str).join(" | ") : "never";
  const roles = config.roles.map((r) => roleSource(r, models)).join("\n");

  return `// Roles and permissions: the single source of truth for access control.
// Edit the \`roles\` list below to add a role or change what a role can do.
// The sidebar, the pages and the server actions all read from this file.

/** Cookie that stores the active role (set by the role switcher). */
export const ROLE_COOKIE = ${str(ROLE_COOKIE_NAME)};

/** Models of the Prisma schema. */
export type ModelName = ${modelUnion};

/** Things a role can do with a model. */
export type Action = "view" | "create" | "edit" | "delete";

export type Role = {
  /** Unique role name, shown in the role switcher. */
  name: string;
  /** Allowed actions for every model. */
  permissions: Record<ModelName, Record<Action, boolean>>;
  /** Models listed in the sidebar for this role. */
  menu: ModelName[];
};

/** All roles. The first one is used when no role is selected yet. */
export const roles: Role[] = [
${roles}
];

/** Finds a role by name. Returns undefined for unknown names. */
export function getRole(name: string | undefined): Role | undefined {
  return roles.find((role) => role.name === name);
}

/**
 * Checks if a role may run an action on a model.
 * Unknown roles and unknown models are always denied.
 * Use it in components to hide buttons and in server actions to enforce access.
 */
export function can(role: string | undefined, model: string, action: Action): boolean {
  const permissions = getRole(role)?.permissions as Record<string, Record<Action, boolean> | undefined> | undefined;
  return permissions?.[model]?.[action] === true;
}
`;
};
