# Leadblocks Customer Portal — Coding Instructions

## Hard Rules

- **Never run `git commit`, `git push`, or any destructive git command** (reset, rebase, force-push, etc.). The user handles all version control.
- **Never start or restart a dev server or build process** (e.g. `npm run dev`, `npm run build`). The user manages that themselves.

## Project Overview

This is a **Next.js 14 (App Router)** frontend using React 18, TypeScript, and Tailwind CSS. It communicates with a **Strapi v5 backend** at `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:1337`). Always consider the impact of frontend changes on the backend API and vice versa.

---

## Production Infrastructure

The backend this portal connects to runs on constrained resources:
- **MySQL**: 4 GB RAM / 2 vCPU / 60 GiB Disk (DigitalOcean AMS3) — connection pool min 2, max 15
- **Redis/Valkey**: 1 GB RAM / 1 vCPU — Bull queues, caching, export metadata
- **Key implication for frontend**: Every API request consumes a DB connection. Avoid redundant/parallel requests, always cancel stale requests, and debounce user-driven queries. The backend uses raw Knex SQL with 14-table joins on the master-database endpoint — every unnecessary request is expensive.

---

## Cross-Project Awareness

- **Before implementing or editing any feature**, check whether the change touches API calls, data structures, or auth flows that connect to the Strapi backend. If it does, verify that the corresponding backend endpoint, schema, or response format still matches.
- When modifying API request payloads, query parameters (e.g. Strapi `filters`, `populate`), or response handling, confirm the backend content-type schema and controller support it.
- When renaming or restructuring shared concepts (campaigns, prospects, companies, etc.), check both the frontend usage and the backend API/content-type definitions.
- If a backend change is also required, note it explicitly rather than assuming it will be handled separately.
- The master-database endpoint returns `customer_names` as a comma-separated string (via GROUP_CONCAT) and `content_json` as a JSON string for campaign follow-ups. Parse these on the frontend; do not request separate endpoints.

---

## Project Structure Conventions

- **Pages** live in `app/` following Next.js App Router conventions. Dashboard sub-routes use `snake_case` folder names (e.g. `all_prospects/`, `import_campaigns/`).
- **Shared components** go in `components/`, organized by domain: `layout/`, `charts/`, `auth/`, `table/`.
- **Utilities and config** go in `lib/` (e.g. `api-config.ts`, `auth.ts`, `storage.ts`).
- **API routes** (Next.js) live in `app/api/` — keep these minimal; business logic belongs in the Strapi backend.
- **Shared components exist in `components/`** — always import `MultiSelect` from `@/components/MultiSelect` instead of redefining it inline in page files. 5 pages currently duplicate MultiSelect — do not add more.

---

## TypeScript & Code Quality

- Use TypeScript for all files. Define explicit interfaces/types for API responses, component props, and state.
- Avoid `any` — use proper types. If a quick prototype needs flexibility, use `unknown` and narrow with type guards.
- Extract shared interfaces (e.g. `User`, `Customer`, `Campaign`, `Prospect`) into a dedicated types file (e.g. `lib/types.ts` or `types/`) instead of duplicating them across page files.
- Keep functions small and single-purpose. If a page file grows beyond ~300 lines, extract logic into custom hooks or helper modules. (Current state: `master_database/page.tsx` is ~7600 lines with 375 `useState` calls — new features should extract logic into hooks, not add more inline state.)
- Use `const` by default; only use `let` when reassignment is truly needed.
- Prefer early returns over deeply nested conditionals.

---

## Component Patterns

- All pages currently use `'use client'`. When adding new pages, consider whether server components could improve performance (e.g. pages with static content or data that doesn't need client interactivity).
- Keep components focused — one component, one responsibility. Extract repeated UI patterns into reusable components.
- Use descriptive component and prop names. Prefer composition over prop-drilling for deeply nested data.
- Memoize expensive computations with `useMemo` and callback references with `useCallback` where appropriate — but don't over-optimize prematurely.
- **Derived state** (e.g. `totalPages = Math.ceil(total / pageSize)`) should be computed with `useMemo`, not stored in a separate `useState`.
- When passing arrays/objects as props to `React.memo` components, wrap them in `useMemo` — otherwise memoization has no effect because a new reference is created every render.
- When passing callbacks (e.g. `onChange`, `onFilter`) to memoized children, wrap them in `useCallback`.

---

## API Calls & Data Fetching

- Use `getBackendUrl()` from `lib/api-config.ts` for all backend URLs. Never hardcode backend URLs.
- Use a consistent environment variable: `NEXT_PUBLIC_BACKEND_URL`. Avoid introducing alternative variables for the same purpose.
- Always include proper error handling for API calls: catch network errors, check response status, and show user-friendly feedback via `react-hot-toast`.
- When constructing Strapi REST queries (`?populate=`, `?filters[]=`), keep them readable. For complex queries, build the URL params in a helper or use URLSearchParams.
- Always include the `Authorization: Bearer ${token}` header for authenticated requests. Use the centralized auth utilities from `lib/auth.ts` — avoid reimplementing cookie/token parsing in individual pages.
- **AbortController**: Always use `AbortController` in `useEffect` cleanup for fetch calls. Cancel previous requests when filters/page change to avoid stale data overwrites and wasted backend connections. (The `all_companies` page has good examples; the dashboard page does not — follow the `all_companies` pattern.)
- **Debounce search inputs**: Text inputs that trigger API calls (search fields, filter text) must be debounced (300–500ms) before firing a request. Never call the API on every keystroke.
- **Avoid bulk ID fetches**: Do not fetch 100k+ IDs in a single request for "select all" features. Use server-side bulk operations or paginated cursors instead.

---

## Authentication & Security

- Auth tokens are stored in cookies. Use the middleware (`middleware.ts`) for route protection — don't rely on client-side checks alone.
- **API-level role enforcement is handled entirely through the Strapi permissions UI** (Settings → Roles). Do not add role checks inside Strapi controllers or middleware in code — trust the UI configuration. Frontend role checks (e.g. redirecting non-Admins) are supplementary UX guards only.
- Never expose sensitive data (tokens, user secrets) in console logs, even during development.
- Use `lib/storage.ts` (`safeLocalStorage`) for any localStorage access to ensure SSR compatibility.
- When setting auth cookies, always include `Secure` (in production), `SameSite=Lax`, and `path=/` flags. The current login sets `document.cookie = \`token=${jwt}; path=/; max-age=86400\`` without `Secure` or `SameSite` — new cookie writes must include them.
- Use a centralized `clearAuthCookie()` utility in `lib/auth.ts` for logout. Do not manually write `document.cookie = 'token=; expires=...'` in individual pages.

---

## Styling

- **Tailwind CSS** is the primary styling approach. Use utility classes directly in JSX.
- Use the configured brand colors from `tailwind.config.js` (`leadblocks.red`, `leadblocks.navy`) instead of hardcoding hex values.
- Avoid adding new MUI components — the project is migrating away from `@mui/material` toward pure Tailwind. Use Tailwind for all new UI. Only `@mui/x-charts` is actively used (for statistics charts).
- Avoid inline `style={}` attributes; prefer Tailwind classes. Only use inline styles for truly dynamic values (e.g. computed widths/positions).

---

## Error Handling

- Wrap pages with `ErrorBoundary` where appropriate to prevent full-page crashes. Consider per-route error boundaries instead of only the root-level one.
- Show meaningful error messages to users. Log detailed errors to the console for debugging (the `next.config.js` `removeConsole` compiler option strips these in production).
- Handle loading, error, and empty states explicitly in every data-fetching component.
- On fetch failure, always update both loading and error state — don't leave the UI in a perpetual loading spinner.

---

## Performance

- Avoid unnecessary re-renders: stabilize object/array references passed as props using `useMemo` and `useCallback`.
- Use Next.js `Image` component for optimized image loading.
- Lazy-load heavy components (charts, modals) with `dynamic()` imports when they're not needed on initial render.
- **Table rendering**: Page sizes are typically 100 rows. When adding new table columns or features, do not cause full-table re-renders. Memoize row components and avoid creating new object/array references in render.
- **Connection pool awareness**: The backend has max 12 DB connections. Avoid firing parallel fetch calls on page load — sequence init requests or combine them into a single endpoint when possible.
- For filter comparison functions (like `areFiltersUnchanged()`), avoid repeated `JSON.stringify()` on every render. Use `useMemo` or a shallow-equality helper.

---

## Dependencies

- **Minimize external packages.** Every added dependency is additional attack surface — check `npm audit` after any install. Before installing something new, check whether an existing dependency (see list below) or a built-in browser/Node/Next.js API already covers the need. Prefer a few extra lines of code using something already installed over adding a new package for a one-off need.
- **Patch routinely, upgrade majors deliberately.** Run `npm audit` periodically and apply `npm audit fix` (no `--force`) for fixes that don't cross a major version — low risk, ship promptly. Never run `npm audit fix --force` blindly: it can silently jump multiple major versions (e.g. Next 14 → 16, skipping 15 entirely) and introduce breaking changes (async `cookies()`/`headers()`/route `params` in Next 15+, changed fetch caching defaults, etc.).
- **Major version upgrades (Next.js, React, etc.) are a separate, deliberate task.** Use the framework's official codemod (e.g. `npx @next/codemod@latest upgrade`) on its own branch, read the migration guide for breaking changes, then verify with a full `npm run build` + typecheck + manual smoke test of the affected flows before merging.

Current key dependencies and their intended use:
- **recharts**: All data visualization charts. Preferred over MUI charts.
- **react-hot-toast**: All user notifications (success, error, info).
- **lucide-react** + **react-icons**: Icons. Use lucide-react for new icons.
- **dayjs**: Date formatting and manipulation. Preferred over `date-fns` (both are installed; use `dayjs` for new code).
- **xlsx**: Excel/CSV export generation (used in export-prospects).
- **@mui/x-charts**: Legacy chart usage in statistics page only — do not expand to new pages.

---

## General Best Practices

- **Don't repeat yourself (DRY)** — extract repeated logic into shared utilities, hooks, or components. This especially applies to MultiSelect (use `@/components/MultiSelect`), cookie handling (use `lib/auth.ts`), and filter state management.
- **Keep commits focused** — one logical change per commit.
- **Remove dead code** — don't leave commented-out blocks or unused imports.
- **Name things clearly** — variables, functions, and files should describe their purpose without needing comments.
- **Add comments only for "why", not "what"** — the code should be self-explanatory; comments explain non-obvious decisions.
- **Test your changes** — verify that both the page you changed and related pages still work. Check the browser console for errors.
- Run `npm run lint` before considering a change complete.
