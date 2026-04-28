import { Link, useLocation } from "@tanstack/react-router";
import { CircleDot } from "lucide-react";

interface Props {
  rightSlot?: React.ReactNode;
  badge?: string;
}

export function AppHeader({ rightSlot, badge }: Props) {
  const { pathname } = useLocation();
  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/executive", label: "Executive Summary" },
  ] as const;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Transaction Junction emblem — subtle brand mark. The pulsing green
              dot is kept from the previous mark as a live/activity indicator. */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/60">
            <img
              src="/tj-mark.svg"
              alt="Transaction Junction"
              className="h-6 w-6"
              width={24}
              height={24}
            />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)]" />
            </span>
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold leading-none tracking-tight">
              Bug Quality Dashboard
            </h1>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {badge ?? "Defect leakage · QA effectiveness"}
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1">
          {links.map((l) => {
            const active = pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {rightSlot ?? (
            <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 sm:flex">
              <CircleDot className="h-3 w-3 text-[var(--success)]" />
              <span className="font-mono text-[11px] text-muted-foreground">Live</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
