import {
  BoxesIcon,
  HomeIcon,
  ListChecksIcon,
  ScanLineIcon,
  SettingsIcon,
  SoupIcon,
} from "lucide-react";
import type React from "react";
import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";

import { Separator } from "~/components/ui/separator";
import { TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

import "./app.css";

const navigation = [
  { label: "Dashboard", href: "/", icon: HomeIcon },
  { label: "Recipes", href: "/recipes", icon: SoupIcon },
  { label: "Inventory", href: "/inventory", icon: BoxesIcon },
  { label: "Shopping", href: "/shopping", icon: ListChecksIcon },
  { label: "Scanner", href: "/scanner", icon: ScanLineIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

interface RouteHandle {
  topbar?: React.ComponentType;
}

export default function App() {
  const matches = useMatches();
  const topbarMatch = [...matches]
    .reverse()
    .find((m) => (m.handle as RouteHandle).topbar);
  const Topbar = (topbarMatch?.handle as RouteHandle)?.topbar;

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[17rem_1fr]">
        <aside className="hidden border-sidebar-border border-r bg-sidebar lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <SoupIcon aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground">Kombu</p>
              <p className="text-muted-foreground text-xs">Kitchen OS</p>
            </div>
          </div>
          <Separator />
          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Main">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )
                }
              >
                <item.icon aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <SoupIcon aria-hidden="true" />
              <span className="font-semibold">Kombu</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {Topbar ? <Topbar /> : null}
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
