/**
 * Role switcher of the generated project: a client component for the top bar
 * and the top bar itself, which reads the active role from the cookie.
 * Role names are never written here: they come from lib/roles.ts at runtime,
 * so that file stays the single source of truth.
 * Pure: no config needed, the output is always the same.
 */

/** components/role-switcher.tsx: segmented control that stores the active role in a cookie. */
export const roleSwitcherTemplate = (): string => `"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ROLE_COOKIE, roles } from "@/lib/roles";

/** One year, so the chosen role survives browser restarts. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Lets a reviewer switch roles to see how the interface changes.
 * The choice is stored in the role cookie, then the page is refreshed
 * so server components (sidebar, pages, actions) read the new role.
 */
export function RoleSwitcher({ activeRole }: { activeRole: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function selectRole(name: string) {
    if (name === activeRole) return;
    document.cookie = \`\${ROLE_COOKIE}=\${encodeURIComponent(name)}; path=/; max-age=\${COOKIE_MAX_AGE}; samesite=lax\`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-3">
      {/* Line icon: a person outline. */}
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      </svg>
      <span className="text-xs uppercase tracking-widest text-muted">Role</span>
      <div
        role="group"
        aria-label="Switch role"
        aria-busy={pending}
        className="flex gap-1 rounded-lg border border-border bg-background p-1"
      >
        {roles.map((role) => {
          const active = role.name === activeRole;
          return (
            <button
              key={role.name}
              type="button"
              aria-pressed={active}
              onClick={() => selectRole(role.name)}
              className={
                active
                  ? "rounded-md bg-accent px-3 py-1 text-sm text-foreground transition-colors duration-200"
                  : "rounded-md px-3 py-1 text-sm text-muted transition-colors duration-200 hover:text-foreground"
              }
            >
              {role.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
`;

/** components/top-bar.tsx: server component that resolves the active role and shows the switcher. */
export const roleTopBarTemplate = (): string => `import { cookies } from "next/headers";

import { RoleSwitcher } from "@/components/role-switcher";
import { ROLE_COOKIE, getRole, roles } from "@/lib/roles";

/** Top bar with the role switcher. Falls back to the first role when no valid cookie is set. */
export async function TopBar() {
  const cookieStore = await cookies();
  const activeRole = getRole(cookieStore.get(ROLE_COOKIE)?.value) ?? roles[0];

  return (
    <header className="flex h-16 items-center justify-end border-b border-border bg-surface px-6">
      {activeRole ? <RoleSwitcher activeRole={activeRole.name} /> : null}
    </header>
  );
}
`;
