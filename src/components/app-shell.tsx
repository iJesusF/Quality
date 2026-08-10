"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import {
  Bell, Box, ChevronDown, ChevronLeft, ClipboardCheck, FileText, FolderKanban,
  Gauge, Home, Menu, PackageCheck, PanelLeftClose, Search, Settings, ShieldAlert,
  Wifi,
} from "lucide-react";

const navigation = [
  ["Inicio", "/dashboard", Home], ["Proyectos", "/projects", FolderKanban], ["Planos", "/drawings", FileText], ["Tramos", "/segments", Box],
  ["Inspecciones", "/inspections", ClipboardCheck], ["Materiales", "/materials", PackageCheck], ["NCR / Punch", "/issues", ShieldAlert],
  ["Reportes", "/reports", Gauge], ["Documentos", "/documents", FileText], ["Turnover", "/turnover", PackageCheck], ["Configuración", "/settings", Settings],
] as const;

export function AppShell({ children, user, project }: { children: ReactNode; user: { name: string; email: string }; project: { name: string; code: string } }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="app-shell">
      {mobileOpen && <button className="scrim" aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">V</div>
          {!collapsed && <div><strong>VORTECH</strong><span>QUALITY</span></div>}
          <button className="icon-button collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}>
            {collapsed ? <ChevronLeft className="rotate-180" /> : <PanelLeftClose />}
          </button>
        </div>
        <nav className="primary-nav" aria-label="Navegación principal">
          {navigation.map(([label, href, Icon]) => (
            <Link href={href} className={pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""} key={label} title={collapsed ? label : undefined}>
              <Icon aria-hidden="true" />{!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="online-dot" /><div className="sidebar-status">{!collapsed && <><strong>Conectado</strong><span>Sin cambios pendientes</span></>}</div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu /></button>
          <Link className="project-switcher" href="/projects"><span className="project-logo">{project.code.slice(0,2)}</span><span><small>PROYECTO ACTIVO</small><strong>{project.name}</strong></span><ChevronDown /></Link>
          <form className="global-search" action="/search"><Search aria-hidden="true" /><label className="sr-only" htmlFor="global-q">Buscar</label><input id="global-q" name="q" placeholder="Buscar tramos, inspecciones, planos, materiales..." /></form>
          <div className="topbar-actions">
            <span className="connection"><Wifi /> ONLINE</span>
            <Link href="/notifications" className="icon-button has-alert" aria-label="Notificaciones"><Bell /></Link>
            <form action={signOutAction}><button className="user-menu" title="Cerrar sesión"><span className="avatar">{user.name.slice(0,2).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span><ChevronDown /></button></form>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
