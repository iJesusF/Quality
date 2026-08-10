"use client";

import { useState, type ReactNode } from "react";
import {
  Bell, Box, ChevronDown, ChevronLeft, ClipboardCheck, FileText, FolderKanban,
  Gauge, Home, Menu, PackageCheck, PanelLeftClose, Search, Settings, ShieldAlert,
  Wifi,
} from "lucide-react";

const navigation = [
  ["Inicio", Home], ["Proyectos", FolderKanban], ["Planos", FileText], ["Tramos", Box],
  ["Inspecciones", ClipboardCheck], ["Materiales", PackageCheck], ["NCR / Punch", ShieldAlert],
  ["Reportes", Gauge], ["Documentos", FileText], ["Turnover", PackageCheck], ["Configuración", Settings],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {navigation.map(([label, Icon], index) => (
            <a href={index === 0 ? "/" : `#${label.toLowerCase().replaceAll(" ", "-")}`} className={index === 0 ? "active" : ""} key={label} title={collapsed ? label : undefined}>
              <Icon aria-hidden="true" />{!collapsed && <span>{label}</span>}
              {!collapsed && label === "NCR / Punch" && <small>7</small>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="online-dot" /><div className="sidebar-status">{!collapsed && <><strong>Conectado</strong><span>Sin cambios pendientes</span></>}</div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><Menu /></button>
          <button className="project-switcher"><span className="project-logo">AC</span><span><small>PROYECTO ACTIVO</small><strong>ARCA Continental</strong></span><ChevronDown /></button>
          <label className="global-search"><Search aria-hidden="true" /><span className="sr-only">Buscar</span><input placeholder="Buscar tramos, inspecciones, planos, materiales..." /></label>
          <div className="topbar-actions">
            <span className="connection"><Wifi /> ONLINE</span>
            <button className="icon-button has-alert" aria-label="Notificaciones"><Bell /></button>
            <button className="user-menu"><span className="avatar">JP</span><span><strong>Juan Pérez</strong><small>Inspector de Calidad</small></span><ChevronDown /></button>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
