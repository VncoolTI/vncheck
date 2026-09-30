# Graph Report - vncheck-employee  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 201 nodes · 334 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e2458a85`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- task/page.tsx
- createClient
- package.json
- next
- compilerOptions
- dependencies
- route.ts
- report/page.tsx
- devDependencies
- server.js
- payslip/page.tsx
- scan/page.tsx
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 35 edges
2. `next` - 27 edges
3. `@heroicons/react` - 24 edges
4. `react` - 22 edges
5. `compilerOptions` - 16 edges
6. `EmployeeKanbanPage()` - 8 edges
7. `date-fns` - 8 edges
8. `scripts` - 5 edges
9. `TimelineView()` - 4 edges
10. `TaskDetailsModal()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `NotificationPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/employee/notification/page.tsx → src/lib/supabase.ts
- `EmployeeOvertimePage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/employee/overtime/page.tsx → src/lib/supabase.ts
- `EmployeeReportPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/employee/report/page.tsx → src/lib/supabase.ts
- `EmployeeScanPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/employee/scan/page.tsx → src/lib/supabase.ts
- `TimelineView()` --calls--> `createClient()`  [EXTRACTED]
  src/app/employee/task/_components/TimelineView.tsx → src/lib/supabase.ts

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "task/page.tsx"
Cohesion: 0.12
Nodes (21): @hello-pangea/dnd, @heroicons/react, react, zustand, BoardView(), INITIAL_COLUMNS, ListView(), PRIORITY_WEIGHT (+13 more)

### Community 1 - "createClient"
Cohesion: 0.12
Nodes (19): Announcement, dynamic, EmployeeDashboard(), dynamic, EmployeeLayout(), dynamic, EmployeeLeavePage(), Leave (+11 more)

### Community 2 - "package.json"
Cohesion: 0.08
Nodes (23): eslintConfig, name, private, scripts, build, dev, lint, start (+15 more)

### Community 3 - "next"
Cohesion: 0.12
Nodes (11): nextConfig, next, src_app_globals, dynamic, geistMono, geistSans, metadata, RootLayout() (+3 more)

### Community 4 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 5 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, date-fns, @hello-pangea/dnd, @heroicons/react, next, react, react-datepicker, react-dom (+8 more)

### Community 6 - "route.ts"
Cohesion: 0.16
Nodes (11): ref_crypto, @supabase/ssr, @supabase/supabase-js, ALLOWED_NEW_USER_ROLES, ALLOWED_PROFILE_FIELDS, dynamic, generateStrongTempPassword(), POST() (+3 more)

### Community 7 - "report/page.tsx"
Cohesion: 0.13
Nodes (12): date-fns, recharts, dynamic, Notification, NotificationPage(), dynamic, EmployeeOvertimePage(), Overtime (+4 more)

### Community 8 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-datepicker (+2 more)

### Community 9 - "server.js"
Cohesion: 0.25
Nodes (7): ref_http, ref_url, app, { createServer }, handle, next, { parse }

### Community 10 - "payslip/page.tsx"
Cohesion: 0.50
Nodes (4): dynamic, getMonthName(), Payslip, PayslipPage()

### Community 11 - "scan/page.tsx"
Cohesion: 0.50
Nodes (3): react-webcam, dynamic, EmployeeScanPage()

## Knowledge Gaps
- **107 isolated node(s):** `Task`, `WorkType`, `KanbanState`, `Announcement`, `Leave` (+102 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 119 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `task/page.tsx`, `createClient`, `package.json`, `route.ts`, `report/page.tsx`, `server.js`, `payslip/page.tsx`, `scan/page.tsx`?**
  _High betweenness centrality (0.314) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `@heroicons/react` connect `task/page.tsx` to `createClient`, `package.json`, `next`, `report/page.tsx`, `payslip/page.tsx`, `scan/page.tsx`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `Task`, `WorkType`, `KanbanState` to the rest of the system?**
  _107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `task/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.11954022988505747 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._