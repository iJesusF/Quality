# Design system

## Product character

VORTECH Quality is a quiet industrial work surface, not an ERP dashboard or marketing site. Information density is moderate, primary actions remain visible on tablets and status is always communicated with text plus icon, never color alone.

## Tokens

- Canvas: `#f4f6f8`; surface: `#ffffff`; strong text: `#15202b`; muted text: `#5f6b76`.
- Primary action/selection: VORTECH blue `#1261a6` and dark state `#0c4a80`.
- Approved: `#18794e`; review: `#b45309`; rejected/overdue: `#c73b3b`.
- Accent colors are used semantically. The interface must not read as a single-hue blue theme.
- Cards use a maximum 8px radius, subtle borders and restrained shadows.
- Touch targets are at least 44px; tablet primary controls target 48px.

## Typography

Geist Sans is the UI face and Geist Mono is reserved for folios, tags and measurements. Dashboard headings stay compact; there is no hero-scale type inside operational panels. Letter spacing remains `0`.

## Core components

| Component | Responsibility |
| --- | --- |
| `AppShell` | Persistent responsive navigation and content frame |
| `Sidebar` / `TopBar` | Route navigation, project context, search and account |
| `PageHeader` | Page identity, breadcrumbs and primary actions |
| `MetricCard` | One KPI with context, progress and status |
| `StatusBadge` | Icon + localized status label |
| `ProgressBar` | Labeled, accessible completion value |
| `DataTable` | Desktop/tablet comparison with a mobile list fallback |
| `DetailDrawer` | Secondary inspection without losing list context |
| `Timeline` | Immutable chronological entity activity |
| `FileCard` / `PhotoGallery` | Document and evidence inspection |
| `DrawingViewer` / `SegmentPanel` | Full drawing canvas and selected segment context |
| `InspectionForm` / `ChecklistTable` | Schema-driven field capture |
| `BottomActionBar` | Stable tablet actions for critical forms |
| `EmptyState` | Clear absence, reason and permitted next action |
| `OfflineBadge` / `SyncStatus` | Connectivity and queued operation state |
| `ConfirmationDialog` | Explicit confirmation for irreversible transitions |

## Responsive rules

- Desktop and tablet landscape: expanded/collapsible left navigation and top bar.
- Tablet portrait: compact rail plus content-first layout.
- Mobile: navigation drawer; metric grid becomes a vertical/two-column flow; tables become lists.
- Fixed-format items use explicit grid tracks and minimum heights to prevent layout shift.
- Critical forms use full pages with a stable action bar, never small modal dialogs.

## Required states

Each data surface supplies loading, empty, expected error, unexpected error, success feedback and permission-denied behavior. Skeletons preserve final dimensions. Focus rings are visible, labels are explicit and icons have accessible names or hidden decorative semantics.
