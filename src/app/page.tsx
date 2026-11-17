import { Database, LayoutDashboard, ShieldCheck } from "lucide-react";

const foundations = [
  { icon: Database, label: "Prisma schema import" },
  { icon: LayoutDashboard, label: "Custom admin dashboards" },
  { icon: ShieldCheck, label: "Role-based permissions" },
];

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,oklch(0.9_0.08_264),transparent_42%)]" />
      <section className="w-full max-w-4xl rounded-3xl border bg-card/90 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-14">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          Project foundation ready
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          Build polished admin tools from your Prisma schema.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Prisma Admin Studio will turn your data model into a customizable,
          role-aware Next.js dashboard that is ready to download and extend.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Studio capabilities">
          {foundations.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-background p-4 text-sm font-medium">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
