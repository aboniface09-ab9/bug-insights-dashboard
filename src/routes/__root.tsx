import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { BugStoreProvider } from "@/lib/bug-store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Transaction Junction — Bug Quality Dashboard" },
      {
        name: "description",
        content:
          "Transaction Junction · Interactive dashboard for defect leakage and QA effectiveness.",
      },
      { name: "author", content: "Transaction Junction" },
      { name: "theme-color", content: "#00c1ff" },
      { property: "og:title", content: "Transaction Junction — Bug Quality Dashboard" },
      {
        property: "og:description",
        content: "Interactive dashboard for defect leakage and QA effectiveness.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // SVG favicon is served statically from /public. Modern browsers use it
      // directly; older ones fall back to the apple-touch-icon alias.
      { rel: "icon", type: "image/svg+xml", href: "/tj-mark.svg" },
      { rel: "apple-touch-icon", href: "/tj-mark.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <BugStoreProvider>
      <Outlet />
    </BugStoreProvider>
  );
}
