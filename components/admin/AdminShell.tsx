"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Site } from "./types";

type NavItem = {
  label: string;
  segment: string;
  exact?: boolean;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Översikt", segment: "", exact: true },
  { label: "Sidor", segment: "pages" },
  { label: "Inlägg", segment: "posts" },
  { label: "Tjänster & priser", segment: "services" },
  { label: "SEO", segment: "seo" },
  { label: "Media", segment: "media" },
  { label: "Aktivitet", segment: "aktivitet" },
  { label: "Inställningar", segment: "installningar", adminOnly: true },
];

type AdminLink = {
  label: string;
  href: string;
};

const ADMIN_LINKS: AdminLink[] = [
  { label: "Användare", href: "/admin/anvandare" },
  { label: "All aktivitet", href: "/admin/aktivitet" },
  { label: "Ny sajt", href: "/admin/sites/new" },
];

type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
};

export default function AdminShell({
  user,
  sites,
  logoutAction,
  children,
}: {
  user: CurrentUser;
  sites: Site[];
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user.role === "admin";

  const activeSiteId = useMemo(() => {
    const match = pathname.match(/\/admin\/sites\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Stäng mobilmenyn varje gång man navigerar till en ny sida.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleSiteChange(siteId: string) {
    router.push(`/admin/sites/${siteId}`);
  }

  const navHref = (segment: string) =>
    activeSiteId
      ? `/admin/sites/${activeSiteId}${segment ? `/${segment}` : ""}`
      : "#";

  const isActive = (segment: string, exact?: boolean) => {
    if (!activeSiteId) return false;
    const href = navHref(segment);
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-5 pt-5">
        <div className="text-sm font-semibold tracking-tight text-white">
          sitecms
        </div>
        <p className="mt-0.5 text-xs text-neutral-400">Adminpanel</p>
      </div>

      {sites.length > 0 && (
        <div className="px-4 pb-4">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Sajt
          </label>
          {sites.length === 1 ? (
            <div className="truncate rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100">
              {sites[0].name}
            </div>
          ) : (
            <select
              value={activeSiteId ?? ""}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-500 focus:outline-none"
            >
              <option value="" disabled>
                Välj sajt…
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="flex-1">
        {activeSiteId && (
          <nav className="space-y-0.5 px-3">
            {visibleNavItems.map((item) => {
              const active = isActive(item.segment, item.exact);
              return (
                <a
                  key={item.label}
                  href={navHref(item.segment)}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-neutral-800 font-medium text-white"
                      : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        )}

        {isAdmin && (
          <div className="mt-4 px-3">
            <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Administration
            </p>
            <nav className="space-y-0.5">
              {ADMIN_LINKS.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-neutral-800 font-medium text-white"
                        : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 px-4 py-4">
        <a
          href="/admin"
          className="block truncate text-xs text-neutral-400 hover:text-neutral-200"
        >
          Alla sajter
        </a>
        <div className="mt-3 truncate text-sm text-neutral-200">
          {user.name}
        </div>
        <div className="truncate text-xs text-neutral-500">{user.email}</div>
        <a
          href="/admin/konto"
          className={`mt-3 block rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/admin/konto"
              ? "bg-neutral-800 font-medium text-white"
              : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
          }`}
        >
          Mitt konto
        </a>
        <form action={logoutAction} className="mt-2">
          <button
            type="submit"
            className="w-full rounded-lg border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            Logga ut
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-neutral-900 md:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between bg-neutral-900 px-4 py-3 md:hidden">
        <span className="text-sm font-semibold tracking-tight text-white">
          sitecms
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Stäng meny" : "Öppna meny"}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-200 hover:bg-neutral-800"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </header>

      {mobileOpen && (
        <div className="bg-neutral-900 md:hidden">{sidebarContent}</div>
      )}

      {/* Innehåll */}
      <main className="min-w-0 flex-1 bg-neutral-50">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
