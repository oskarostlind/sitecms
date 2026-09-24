"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Check,
  ChevronsUpDown,
  ChevronUp,
  ExternalLink,
  FileText,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Logo, ToastProvider, buttonClassName } from "@/components/ui";
import { cn } from "@/lib/cn";
import { displayDomain, siteUrl } from "@/lib/site-url";
import type { Site } from "./types";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

type SiteNavItem = {
  label: string;
  segment: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
};

const SITE_NAV: SiteNavItem[] = [
  { label: "Översikt", segment: "", icon: LayoutDashboard, exact: true },
  { label: "Sidor", segment: "pages", icon: FileText },
  { label: "Inlägg", segment: "posts", icon: Newspaper },
  { label: "Tjänster & priser", segment: "services", icon: BriefcaseBusiness },
  { label: "SEO", segment: "seo", icon: Search },
  { label: "Media", segment: "media", icon: ImageIcon },
  { label: "Aktivitet", segment: "aktivitet", icon: History },
  { label: "Inställningar", segment: "installningar", icon: Settings, adminOnly: true },
];

type AdminNavItem = { label: string; href: string; icon: LucideIcon };

const ADMIN_NAV: AdminNavItem[] = [
  { label: "Användare", href: "/admin/anvandare", icon: Users },
  { label: "All aktivitet", href: "/admin/aktivitet", icon: Activity },
  { label: "Ny sajt", href: "/admin/sites/new", icon: Plus },
];

/** Segment under /admin/sites/ som inte är ett sajt-id. */
const RESERVED_SITE_SEGMENTS = new Set(["new"]);

export type AdminShellUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "customer";
};

export type AdminShellProps = {
  user: AdminShellUser;
  sites: Site[];
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50";

function isPathActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function siteHref(siteId: string, segment: string) {
  return `/admin/sites/${siteId}${segment ? `/${segment}` : ""}`;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export default function AdminShell({ user, sites, logoutAction, children }: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";
  const isAdmin = user.role === "admin";

  const siteMatch = pathname.match(/^\/admin\/sites\/([^/]+)/);
  const activeSiteId =
    siteMatch && !RESERVED_SITE_SEGMENTS.has(siteMatch[1]) ? decodeURIComponent(siteMatch[1]) : null;
  const activeSite = activeSiteId ? (sites.find((s) => s.id === activeSiteId) ?? null) : null;

  const siteNav = SITE_NAV.filter((item) => !item.adminOnly || isAdmin);

  // Etikett för aktiv sektion (brödsmulan i topbaren).
  const sectionLabel = (() => {
    if (activeSiteId) {
      const item = siteNav.find((i) => isPathActive(pathname, siteHref(activeSiteId, i.segment), i.exact));
      return item?.label ?? null;
    }
    const adminItem = ADMIN_NAV.find((i) => isPathActive(pathname, i.href));
    if (adminItem) return adminItem.label;
    if (isPathActive(pathname, "/admin/konto")) return "Mitt konto";
    if (pathname === "/admin") return "Dina sajter";
    return null;
  })();

  // Mobilmenyn: öppen för den sökväg där den öppnades → stängs automatiskt vid navigering.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback((restoreFocus = false) => {
    setDrawerPath(null);
    if (restoreFocus) hamburgerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    // Lås body-scroll.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Fokusera första länken i menyn.
    const drawer = drawerRef.current;
    const firstLink =
      drawer?.querySelector<HTMLElement>("[data-sidebar-nav] a[href]") ??
      drawer?.querySelector<HTMLElement>("a[href], button:not([disabled])");
    firstLink?.focus();

    function onKeyDown(event: KeyboardEvent) {
      // Popovers i menyn hanterar Escape själva och markerar det med preventDefault.
      if (event.key === "Escape" && !event.defaultPrevented) closeDrawer(true);
    }
    const desktop = window.matchMedia("(min-width: 768px)");
    function onBreakpoint(event: MediaQueryListEvent) {
      if (event.matches) closeDrawer();
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [drawerOpen, closeDrawer]);

  const viewUrl = siteUrl(activeSite?.domain);

  const sidebarProps: SidebarContentProps = {
    user,
    sites,
    isAdmin,
    pathname,
    activeSiteId,
    activeSite,
    siteNav,
    logoutAction,
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen overflow-x-clip bg-neutral-50">
        {/* Desktop-sidebar */}
        <aside
          aria-label="Huvudmeny"
          className="sticky top-0 hidden h-dvh w-[260px] shrink-0 self-start border-r border-neutral-200 bg-white md:block"
        >
          <SidebarContent {...sidebarProps} />
        </aside>

        {/* Mobil-drawer */}
        <div
          aria-hidden
          onClick={() => closeDrawer()}
          className={cn(
            "fixed inset-0 z-30 bg-neutral-900/40 transition-opacity duration-200 md:hidden",
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        />
        <div
          ref={drawerRef}
          id="admin-mobile-drawer"
          role="dialog"
          aria-modal={drawerOpen || undefined}
          aria-label="Meny"
          inert={!drawerOpen}
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] border-r border-neutral-200 bg-white shadow-xl transition-transform duration-200 ease-out md:hidden",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent {...sidebarProps} onClose={() => closeDrawer(true)} onNavigate={() => closeDrawer()} />
        </div>

        {/* Innehåll */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobil-topbar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur md:hidden">
            <Link href="/admin" className={cn("rounded-md", focusRing)}>
              <Logo size={26} />
            </Link>
            <div className="flex items-center gap-1">
              {viewUrl ? (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visa sajten (öppnas i ny flik)"
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg text-neutral-600 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900",
                    focusRing,
                  )}
                >
                  <ExternalLink aria-hidden className="size-5" />
                </a>
              ) : null}
              <button
                ref={hamburgerRef}
                type="button"
                onClick={() => (drawerOpen ? closeDrawer() : setDrawerPath(pathname))}
                aria-label={drawerOpen ? "Stäng meny" : "Öppna meny"}
                aria-expanded={drawerOpen}
                aria-controls="admin-mobile-drawer"
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg text-neutral-700 transition-colors duration-150 hover:bg-neutral-100",
                  focusRing,
                )}
              >
                {drawerOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
              </button>
            </div>
          </header>

          {/* Desktop-topbar */}
          <div className="sticky top-0 z-20 hidden h-14 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur md:block">
            <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-4 px-8">
              <nav aria-label="Du är här" className="min-w-0">
                <ol className="flex min-w-0 items-center gap-2 text-sm">
                  {activeSiteId ? (
                    <li className="min-w-0">
                      <Link
                        href={siteHref(activeSiteId, "")}
                        className={cn(
                          "block truncate rounded-md font-medium text-neutral-900 transition-colors duration-150 hover:text-brand-700",
                          focusRing,
                        )}
                      >
                        {activeSite?.name ?? "Sajt"}
                      </Link>
                    </li>
                  ) : null}
                  {activeSiteId && sectionLabel ? (
                    <li aria-hidden className="text-neutral-300">
                      /
                    </li>
                  ) : null}
                  {sectionLabel ? (
                    <li aria-current="page" className="shrink-0 text-neutral-500">
                      {sectionLabel}
                    </li>
                  ) : null}
                </ol>
              </nav>
              {viewUrl ? (
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClassName({ variant: "ghost", size: "sm" })}
                >
                  Visa sajten
                  <ExternalLink aria-hidden className="size-4" />
                  <span className="sr-only">(öppnas i ny flik)</span>
                </a>
              ) : null}
            </div>
          </div>

          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// Sidebar-innehåll (samma för desktop och mobil-drawer)
// ---------------------------------------------------------------------------

type SidebarContentProps = {
  user: AdminShellUser;
  sites: Site[];
  isAdmin: boolean;
  pathname: string;
  activeSiteId: string | null;
  activeSite: Site | null;
  siteNav: SiteNavItem[];
  logoutAction: () => Promise<void>;
  /** Endast i mobil-drawern: visar en stäng-knapp. */
  onClose?: () => void;
  /** Anropas när en länk i menyn klickas (stänger mobil-drawern). */
  onNavigate?: () => void;
};

function SidebarContent({
  user,
  sites,
  isAdmin,
  pathname,
  activeSiteId,
  activeSite,
  siteNav,
  logoutAction,
  onClose,
  onNavigate,
}: SidebarContentProps) {
  const adminHeadingId = useId();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-5">
        <Link href="/admin" onClick={onNavigate} className={cn("rounded-md", focusRing)}>
          <Logo size={26} />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng meny"
            className={cn(
              "-mr-2 flex size-9 items-center justify-center rounded-md text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900",
              focusRing,
            )}
          >
            <X aria-hidden className="size-5" />
          </button>
        ) : null}
      </div>

      {sites.length > 0 ? (
        <div className="shrink-0 px-3 pb-3">
          <SiteSwitcher
            sites={sites}
            isAdmin={isAdmin}
            activeSiteId={activeSiteId}
            activeSite={activeSite}
            onNavigate={onNavigate}
          />
          {!activeSiteId && sites.length > 1 ? (
            <p className="mt-2 px-1 text-xs text-neutral-500">Välj en sajt för att börja</p>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" data-sidebar-nav="">
        {activeSiteId ? (
          <nav aria-label="Sajtmeny">
            <ul className="space-y-0.5">
              {siteNav.map((item) => {
                const href = siteHref(activeSiteId, item.segment);
                return (
                  <li key={item.segment || "overview"}>
                    <NavLink
                      href={href}
                      label={item.label}
                      icon={item.icon}
                      active={isPathActive(pathname, href, item.exact)}
                      onNavigate={onNavigate}
                    />
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        {isAdmin ? (
          <nav aria-labelledby={adminHeadingId} className={cn(activeSiteId && "mt-6")}>
            <p
              id={adminHeadingId}
              className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
            >
              Admin
            </p>
            <ul className="space-y-0.5">
              {ADMIN_NAV.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isPathActive(pathname, item.href)}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-neutral-200 p-3">
        <UserMenu user={user} pathname={pathname} logoutAction={logoutAction} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
        focusRing,
        active
          ? "bg-brand-50 font-medium text-brand-700"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", active ? "text-brand-600" : "text-neutral-500")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Popover-hjälp: stäng vid klick utanför
// ---------------------------------------------------------------------------

function useClickOutside(open: boolean, rootRef: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onOutside();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, rootRef, onOutside]);
}

/** Stäng när fokus flyttas (t.ex. med Tab) till ett element utanför popovern. */
function blurOutside(event: React.FocusEvent<HTMLElement>, close: () => void) {
  const next = event.relatedTarget as Node | null;
  if (next && !event.currentTarget.contains(next)) close();
}

// ---------------------------------------------------------------------------
// Sajtväljare
// ---------------------------------------------------------------------------

function SiteSwitcher({
  sites,
  isAdmin,
  activeSiteId,
  activeSite,
  onNavigate,
}: {
  sites: Site[];
  isAdmin: boolean;
  activeSiteId: string | null;
  activeSite: Site | null;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(open, rootRef, close);

  // Flytta fokus till aktiv (eller första) sajt när listan öppnas.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const target =
      list?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
      list?.querySelector<HTMLElement>('[role="option"]');
    target?.focus();
  }, [open]);

  // Kund med exakt en sajt: statisk rad.
  if (!isAdmin && sites.length === 1) {
    const only = sites[0];
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2">
        <Avatar name={only.name} size={28} className="rounded-md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{only.name}</p>
          {only.domain ? <p className="truncate text-xs text-neutral-500">{displayDomain(only.domain)}</p> : null}
        </div>
      </div>
    );
  }

  const current = activeSite ?? null;

  function onListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const options = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    if (options.length === 0) return;
    const index = options.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = index < 0 ? 0 : Math.min(index + 1, options.length - 1);
    else if (event.key === "ArrowUp") next = index < 0 ? options.length - 1 : Math.max(index - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    if (next !== null) {
      event.preventDefault();
      options[next]?.focus();
    }
  }

  function select() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => blurOutside(event, close)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-left shadow-sm transition-colors duration-150 hover:bg-neutral-50",
          focusRing,
          open && "bg-neutral-50",
        )}
      >
        {current ? (
          <Avatar name={current.name} size={28} className="rounded-md" />
        ) : (
          <span
            aria-hidden
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-300 text-neutral-400"
          >
            <LayoutDashboard className="size-3.5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="sr-only">Byt sajt. Vald sajt: </span>
          <span className={cn("block truncate text-sm", current ? "font-medium text-neutral-900" : "text-neutral-500")}>
            {current ? current.name : "Välj sajt…"}
          </span>
        </span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-neutral-400" />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg animate-slide-up-fade">
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Sajter"
            onKeyDown={onListKeyDown}
            className="max-h-72 overflow-y-auto p-1"
          >
            {sites.map((site) => {
              const selected = site.id === activeSiteId;
              return (
                <Link
                  key={site.id}
                  href={siteHref(site.id, "")}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={select}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-neutral-100 focus:bg-neutral-100 focus-visible:outline-none",
                    selected && "bg-brand-50/60",
                  )}
                >
                  <Avatar name={site.name} size={24} className="rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-neutral-900">{site.name}</span>
                    <span className="block truncate text-xs text-neutral-500">
                      {site.domain ? displayDomain(site.domain) : "Ingen domän"}
                    </span>
                  </span>
                  {selected ? <Check aria-hidden className="size-4 shrink-0 text-brand-600" /> : null}
                </Link>
              );
            })}
          </div>
          {isAdmin ? (
            <div className="border-t border-neutral-200 p-1">
              <Link
                href="/admin"
                onClick={select}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900",
                  focusRing,
                )}
              >
                <LayoutDashboard aria-hidden className="size-4 text-neutral-500" />
                Alla sajter
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Användarmeny
// ---------------------------------------------------------------------------

function UserMenu({
  user,
  pathname,
  logoutAction,
  onNavigate,
}: {
  user: AdminShellUser;
  pathname: string;
  logoutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(open, rootRef, close);

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
  }, [open]);

  const displayName = user.name || user.email;
  const accountActive = isPathActive(pathname, "/admin/konto");

  const itemClass = cn(
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-900",
    focusRing,
  );

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => blurOutside(event, close)}
    >
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          className="absolute inset-x-0 bottom-full z-30 mb-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg animate-slide-up-fade"
        >
          <Link
            href="/admin/konto"
            aria-current={accountActive ? "page" : undefined}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={cn(itemClass, accountActive && "bg-brand-50 text-brand-700")}
          >
            <UserRound aria-hidden className={cn("size-4", accountActive ? "text-brand-600" : "text-neutral-500")} />
            Mitt konto
          </Link>
          <form action={logoutAction}>
            <button type="submit" className={itemClass}>
              <LogOut aria-hidden className="size-4 text-neutral-500" />
              Logga ut
            </button>
          </form>
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Kontomeny för ${displayName}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors duration-150 hover:bg-neutral-100",
          focusRing,
          open && "bg-neutral-100",
        )}
      >
        <Avatar name={displayName} size={32} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900">{user.name || "Mitt konto"}</span>
          <span className="block truncate text-xs text-neutral-500">{user.email}</span>
        </span>
        <ChevronUp
          aria-hidden
          className={cn("size-4 shrink-0 text-neutral-400 transition-transform duration-150", open && "rotate-180")}
        />
      </button>
    </div>
  );
}
