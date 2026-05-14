# Library Management System — Project Plan

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + `@supabase/ssr` (cookie-based sessions) |
| Reporting | CSV export (built-in) |

> **Why Supabase?** Managed PostgreSQL, built-in auth (handles password hashing, JWT, sessions), Row Level Security, and a real-time client — no backend infra to manage.

---

## Data Models

### `profiles` (extends Supabase `auth.users`)
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | Matches `auth.users.id` |
| name | text | Display name |
| role | text | `'user'` or `'admin'` |
| created_at | timestamptz | Auto |

> **Auth:** Email/password handled entirely by Supabase Auth. The `profiles` table stores app-level data linked by `id`.
> **Constraint:** Maximum 3 accounts with `role = 'admin'` — enforced via a Postgres trigger or checked in the server route before updating role.

### `books`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| title | text | |
| author | text | |
| serial_no | text UNIQUE | Physical identifier |
| is_available | boolean | `true` = on shelf |
| created_at | timestamptz | Auto |

### `borrow_records`
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid FK | References `profiles.id` |
| book_id | uuid FK | References `books.id` |
| borrowed_at | timestamptz | When borrowed |
| returned_at | timestamptz NULL | `null` = still out |
| force_returned | boolean | `true` = admin forced |
| force_returned_by | uuid NULL | Admin profile id |

---

## Route Structure

```
src/routes/
│
├── +layout.svelte              ← root layout (no auth)
├── +page.svelte                ← redirect → /login or /dashboard
│
├── login/
│   └── +page.svelte            ← login form
│
├── register/
│   └── +page.svelte            ← register form (role defaults to 'user')
│
├── (user)/                     ← group: authenticated user role
│   ├── +layout.svelte          ← user nav + auth guard
│   ├── dashboard/
│   │   └── +page.svelte        ← user home (active borrows summary)
│   ├── books/
│   │   └── +page.svelte        ← search + borrow books
│   └── borrows/
│       └── +page.svelte        ← my borrow history
│
└── (admin)/                    ← group: authenticated admin role
    ├── +layout.svelte          ← admin nav + admin auth guard
    ├── dashboard/
    │   └── +page.svelte        ← admin home (stats overview)
    ├── books/
    │   └── +page.svelte        ← add / delete / search books
    ├── borrows/
    │   └── +page.svelte        ← all borrow history + force return
    └── reports/
        └── +page.svelte        ← generate & download CSV reports
```

---

## API Endpoints (SvelteKit Server Routes)

```
src/routes/api/
│
├── auth/
│   ├── login/          +server.ts   POST  → set session cookie
│   ├── logout/         +server.ts   POST  → clear session cookie
│   └── register/       +server.ts   POST  → create user account
│
├── books/
│   ├── +server.ts                   GET   → search books (query param)
│   └── [id]/
│       └── +server.ts               DELETE → delete book (admin)
│
├── books/add/
│   └── +server.ts                   POST  → add book (admin)
│
├── borrows/
│   ├── +server.ts                   GET   → list borrow records
│   ├── borrow/         +server.ts   POST  → borrow a book (user)
│   ├── return/         +server.ts   POST  → return a book (user)
│   └── force-return/   +server.ts   POST  → force return (admin)
│
└── reports/
    └── +server.ts                   GET   → download CSV report (admin)
```

---

## Feature Breakdown

### Phase 1 — Foundation & Auth
- [ ] Install `@supabase/supabase-js`, `@supabase/ssr`
- [ ] Create Supabase project, set up `profiles`, `books`, `borrow_records` tables with RLS policies
- [ ] Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`
- [ ] Create `src/lib/server/supabase.ts` — server-side Supabase client (cookie-based)
- [ ] Create `src/lib/supabase.ts` — browser-side Supabase client
- [ ] Implement `src/hooks.server.ts` — create Supabase client per request, attach `locals.supabase` and `locals.user`
- [ ] Build `/login` page + Supabase `signInWithPassword`
- [ ] Build `/register` page + Supabase `signUp` (creates `auth.users` entry, insert `profiles` row, enforce max 3 admins check)
- [ ] Build logout action using `supabase.auth.signOut()`

### Phase 2 — User Dashboard
- [ ] Auth guard in `(user)/+layout.svelte` — redirect if not logged in or not `user` role
- [ ] `/dashboard` — show user name, count of active borrows
- [ ] `/books` — search books by title/author/serial, show availability badge
- [ ] `/books` — "Borrow" button (disabled if book unavailable or user already has it)
- [ ] `/borrows` — list user's own borrow history (borrowed date, returned date, status)
- [ ] Return book action from `/borrows`

### Phase 3 — Admin Dashboard
- [ ] Auth guard in `(admin)/+layout.svelte` — redirect if not admin role
- [ ] `/admin/dashboard` — stats: total books, books out, registered users, total borrows
- [ ] `/admin/books` — search books, add book form (title, author, serial no.), delete book
- [ ] `/admin/borrows` — full borrow history table, filter by user/book/date
- [ ] Force return action on active borrow rows
- [ ] `/admin/reports` — date range picker, generate CSV, download

### Phase 4 — Polish & Validation
- [ ] Form validation (client + server side)
- [ ] Error handling pages (`+error.svelte`)
- [ ] Loading states / skeleton screens
- [ ] Responsive layout (mobile friendly)
- [ ] Empty states for tables

---

## Business Rules

| Rule | Implementation |
|---|---|
| Max 3 admins | Server route queries `profiles` count where `role = 'admin'` before promoting/registering an admin |
| User can only borrow an available book | Check `is_available = true` before creating borrow record |
| User can only return their own book | Validate `user_id` on return endpoint |
| Admin can force-return any book | No ownership check, sets `force_returned = true` |
| Deleting a book blocks if it has active borrows | Check for open borrow records before delete |
| Report includes all history within date range | Filter `borrow_records` by `borrowed_at` range |

---

## File Structure (Final)

```
src/
├── app.html
├── app.d.ts                    ← add App.Locals (user session type)
├── hooks.server.ts             ← session → locals.user
├── lib/
│   ├── index.ts
│   ├── server/
│   │   └── supabase.ts         ← server-side Supabase client (SSR cookies)
│   ├── supabase.ts             ← browser-side Supabase client
│   ├── components/
│   │   ├── BookCard.svelte
│   │   ├── BorrowTable.svelte
│   │   ├── Navbar.svelte
│   │   └── ReportDownload.svelte
│   └── types.ts                ← shared TS interfaces (User, Book, BorrowRecord)
└── routes/
    └── (see Route Structure above)
```

---

## Dependencies to Install

```bash
bun add @supabase/supabase-js @supabase/ssr
```

## Environment Variables

Create a `.env` file in `lib-sys/`:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Setup Checklist

- [ ] Create tables: `profiles`, `books`, `borrow_records`
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] RLS policy: users can only read/write their own `borrow_records`
- [ ] RLS policy: admins have full access via service role or custom policy
- [ ] Create Postgres trigger: `on auth.users insert → insert into profiles`
- [ ] (Optional) Create DB trigger to enforce max 3 admin constraint

---

## Development Order

```
1. Supabase project setup (tables, RLS, triggers)
2. SvelteKit ↔ Supabase wiring (clients, hooks, env vars)
3. Auth (login / register / logout)
4. User flows (search → borrow → return)
5. Admin flows (add/delete book → view borrows → force return)
6. Reports (CSV generation)
7. UI polish
```
