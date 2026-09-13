# Technical Design Document: Sports Camp Attendance System

**Project:** University Athletics — Sports Camp Attendance System (`sports-attendance`)
**Document type:** Technical Design Document (Data Architecture · Request Flows · RBAC · Content Visibility)
**Date:** 2026-09-11

---

## 1. System Overview & Scope

### 1.1 High-Level Architecture

The system is a **sport-centric attendance management platform** for a university athletics department. It replaces a legacy `Camp → Team → Sport` hierarchy with a flat **`Sport`-program model**, where each sport program owns its training sessions, attendance registers, and performance evaluations, and draws its athletes from a **shared player pool** — players participate in many sports via the `player_sports` join table (Phase-1 multi-sport refactor).

Logical topology:

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  React 19 SPA (Vite/TS)      │   CORS  │  Spring Boot 3.2 API          │
│  Browser  :5173              │ ──────► │  Tomcat :8080                 │
│  Axios + Basic Auth          │ rest/√  │  Security / Controllers /    │
│  TanStack Query cache        │ JSON    │  Services / Repositories     │
│  sessionStorage token store  │         └──────────────┬───────────────┘
└──────────────────────────────┘                        │ JPA / JDBC
                                                        ▼
                                        ┌──────────────────────────────┐
                                        │  PostgreSQL on Supabase       │
                                        │  (PgBouncer pooler :6543)     │
                                        │  Flyway migrations            │
                                        └──────────────────────────────┘
```

Three consumers share one Spring Security session story:
1. **React SPA** (`frontend/`) — the primary UI. Authenticates via **HTTP Basic**, caches the encoded `Basic <b64(user:pass)>` token in `sessionStorage`, and calls `/api/**`.
2. **Thymeleaf pages** (`/login`, `/dashboard`, `/admin/**`, `/captain/**`) — legacy server-rendered fallback with form login + session cookie (`JSESSIONID`); the SPA has superseded these but the MVC controllers (`AuthController`) remain and route role-based page redirects.
3. **Direct REST clients** (`requests.http`, scripts) — Basic auth against `/api/**`.

### 1.2 Core Technical Stack

| Layer | Technology | Version / Notes |
| :--- | :--- | :--- |
| **Frontend** | React + TypeScript | React 19.2, Vite 8, `@vitejs/plugin-react` |
| | Data fetching | TanStack Query 5 (`@tanstack/react-query`) + Axios 1.11 |
| | Routing | React Router 7 |
| | Forms / Validation | React Hook Form + Zod 4 + `@hookform/resolvers` |
| | UI | Tailwind CSS 4, shadcn/ui primitives (Radix), lucide-react icons, sonner toasts |
| **Backend** | Java 17 + Spring Boot 3.2.4 | `spring-boot-starter-web`, `-data-jpa`, `-security`, `-validation`, `-thymeleaf` |
| | Build | Maven (`pom.xml`), artifact `sports-attendance-1.0.0-SNAPSHOT` |
| | Persistence | Spring Data JPA (Hibernate, `ddl-auto: validate`) |
| | Migrations | Flyway (`classpath:db/migration`) |
| | Object mapping | Lombok (`@Getter/@Setter/@Builder`), Jackson |
| **Database** | PostgreSQL | Supabase-hosted; PgBouncer **transaction pooler** (`:6543`) for the app, **direct** connection (`:5432`) for Flyway DDL |
| **Authn / Authz** | Spring Security | HTTP Basic + Form login + `DaoAuthenticationProvider` + `BCryptPasswordEncoder`; method-level `@PreAuthorize` |
| **Ops** | Actuator | Exposes `/actuator/health`, `/actuator/info` only |

> **Note on documentation drift:** `backend/README.md` still describes the pre-migration `Camp/Team` model and a `requests.http` file that no longer exists. The authoritative schema is the **Flyway migration chain (V1→V6) + JPA entities**, documented below. V5 moved athletes from single-sport (`players.sport_id`) to multi-sport (`player_sports`) and made captaincy player-based (`sport_captains.player_id`); V6 added `players.department`.

---

## 2. Database Architecture & Schema

### 2.1 Entity–Relationship Overview

```
                          ┌───────────────────────────┐
                          │       player_sports       │  M : N join (PK: player_id + sport_id)
                          │  player_id ⟷ sport_id     │
                          └────────────┬──────────────┘
                                       │ M            │ N
                            ┌──────────▼──┐    ┌──────▼─────────┐
                            │  players     │    │   sports      │
                            │  (athletes)  │    │  (programs)   │
                            └──────┬───────┘    └──────┬─────────┘
                                   │ 1                 │ 1
                                   │          ┌────────▼─────────┐
                                   │          │  training_sessions│
                                   │          └────────┬─────────┘
                                   │                    │ 1
                          ┌────────▼──────┐    ┌────────▼─────────┐
                          │  attendances  │    │ player_evaluations│
                          └───────────────┘    └──────────────────┘
                                    (player_id ✕ session_id UNIQUE on both)

Captaincy  :  sport_captains (sport_id, player_id, UNIQUE(player_id))
              A sport has ≤3 player-captains; a single player captains ≤1 sport
              (uk_captain_single_sport).
Audit FKs  :  attendances.marked_by, player_evaluations.evaluated_by → users.id (SET NULL)
              users (ROLE_CAPTAIN login accounts) are bridged to players via shared email.
```

| Relationship | Cardinality | Mapping | Cascade |
| :--- | :--- | :--- | :--- |
| `players` ⟷ `sports` (membership) | M : N | `player_sports` join table (`Player.sports`, owning) | Both FKs `ON DELETE CASCADE` |
| `players` ⟷ `sports` (captainship) | M : N, captained ≤ 1 | `sport_captains` join table (`Sport.captains`) | Both FKs `ON DELETE CASCADE` |
| `sports` → `training_sessions` | 1 : N | `training_sessions.sport_id` | `ON DELETE CASCADE` |
| `players` → `attendances` | 1 : N | `attendances.player_id` | `ON DELETE CASCADE` |
| `training_sessions` → `attendances` | 1 : N | `attendances.session_id` | `ON DELETE CASCADE` |
| `players` → `player_evaluations` | 1 : N | `player_evaluations.player_id` | `ON DELETE CASCADE` |
| `training_sessions` → `player_evaluations` | 1 : N | `player_evaluations.session_id` | `ON DELETE CASCADE` |
| `users` → `attendances` (who marked) | 1 : N | `attendances.marked_by` | `ON DELETE SET NULL` |
| `users` → `player_evaluations` (evaluator) | 1 : N | `player_evaluations.evaluated_by` | `ON DELETE SET NULL` |

### 2.2 Database Schemas

All tables inherit the audit pair `created_at TIMESTAMP NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`, maintained by JPA auditing (`BaseEntity` with `@CreatedDate`/`@LastModifiedDate`, enabled via `@EnableJpaAuditing`).

#### `users`

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK — `user_id_seq` | Surrogate key |
| `username` | VARCHAR(100) | NOT NULL, **UNIQUE** | Login identifier |
| `password_hash` | VARCHAR(255) | NOT NULL | **BCrypt** hash; never serialized (`@JsonIgnore`) |
| `full_name` | VARCHAR(100) | NOT NULL | Display name |
| `phone` | VARCHAR(20) | NULL | Contact |
| `email` | VARCHAR(100) | NULL | Contact; used to "re-link" auto-created captain accounts |
| `role` | VARCHAR(20) | NOT NULL, `ROLE_ADMIN \| ROLE_CAPTAIN` | System role (mapped `ENUM STRING`) |
| `enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | Login gate; disabled users fail authentication (`CustomUserDetailsService.disabled`) |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Audit timestamps |

#### `sports`

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK — `sport_id_seq` | Surrogate key |
| `name` | VARCHAR(100) | NOT NULL, **UNIQUE** (`uk_sport_name`) | Discipline name (case-insensitive dedupe in service) |
| `description` | VARCHAR(500) | NULL | Long description |
| `active` | BOOLEAN | NOT NULL, DEFAULT TRUE | **Soft-delete flag**; inactive sports hidden from `/api/sports/active` |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Audit timestamps |

#### `sport_captains` (join table — player-based captaincy)

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `sport_id` | BIGINT | FK → `sports.id`, `ON DELETE CASCADE`; part of composite PK | Owning sport |
| `player_id` | BIGINT | FK → `players.id`, `ON DELETE CASCADE`; part of composite PK | Assigned player-captain |
| `assigned_at` | TIMESTAMP | NOT NULL | When the captain was assigned |
| — | — | **UNIQUE** `uk_captain_single_sport` (`player_id`) | **A player captains at most one sport** |

Migration note (V5): `sport_captains` previously linked `users.id`; the V5 migration recreates it against `players.id`, migrating existing captains by matching player↔user email, and adds the single-captain rule.

Business rules enforced at the application layer: **max 3 captains per sport** (`MAX_CAPTAINS_PER_SPORT = 3` in `SportService`) and **≤1 sport per captain** (also backed by the `uk_captain_single_sport` unique constraint).

#### `player_sports` (join table — multi-sport membership)

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `player_id` | BIGINT | FK → `players.id`, `ON DELETE CASCADE`; part of composite PK | Athlete |
| `sport_id` | BIGINT | FK → `sports.id`, `ON DELETE CASCADE`; part of composite PK | Sport they participate in |
| `created_at` | TIMESTAMP | NOT NULL | Audit timestamp |

Added in V5; seeded from the previous single-sport `players.sport_id`. The `Player.sports` (`@ManyToMany`, owning side) collection is kept in sync with the sport side via `Player.addSport`/`removeSport` helpers.

#### `players`

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK — `player_id_seq` | Surrogate key |
| `full_name` | VARCHAR(150) | NOT NULL | Athlete name |
| `date_of_birth` | DATE | NULL | DOB (PII — visibility governed, §5) |
| `jersey_number` | INT | NULL | Jersey number (no longer unique per sport — multi-sport model dropped `uk_player_jersey_sport` in V5) |
| `position` | VARCHAR(200) | NULL | e.g. Striker, Bowler, Player-Coach |
| `phone` | VARCHAR(20) | NULL | Contact (PII) |
| `email` | VARCHAR(100) | NULL | Contact; key link for captain promotion / email bridge to a `users` login |
| `department` | VARCHAR(100) | NULL | University department / team label (V6) → shown in unified profile |
| `notes` | VARCHAR(500) | NULL | Free text / medical notes (PII) |
| `active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft-deactivation flag (`PlayerService.deactivate`) |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Audit timestamps |

Memberships live in `player_sports` (not a `sport_id` column). For backward compatibility the entity still exposes a computed `sportId` — the id of the **first** sport in the set — used only as a display hint; callers should prefer the explicit `sports[]` list.

#### `training_sessions`

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK — `session_id_seq` | Surrogate key |
| `title` | VARCHAR(200) | NOT NULL | e.g. `"2026-09-11 - Morning"` (generated from date+slot) |
| `session_date` | DATE | NOT NULL | Training day |
| `start_time` | TIME | NULL | Slot start (Morning `07:00` / Evening `16:30`) |
| `end_time` | TIME | NULL | Slot end (Morning `09:00` / Evening `18:30`) |
| `notes` | VARCHAR(500) | NULL | Coach notes |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT `SCHEDULED` | `SCHEDULED \| IN_PROGRESS \| COMPLETED \| CANCELLED` |
| `sport_id` | BIGINT | NOT NULL, FK → `sports.id`, `ON DELETE CASCADE` | Owning program |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Audit timestamps |

#### `attendances`

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK — `attendance_id_seq` | Surrogate key |
| `player_id` | BIGINT | NOT NULL, FK → `players.id`, `ON DELETE CASCADE` | Athlete |
| `session_id` | BIGINT | NOT NULL, FK → `training_sessions.id`, `ON DELETE CASCADE` | Session |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT `ABSENT` | `PRESENT \| ABSENT \| LATE \| EXCUSED` |
| `marked_by` | BIGINT | NULL, FK → `users.id`, `ON DELETE SET NULL` | **Audit** — who recorded it (immortalizes the captain at time of marking) |
| `marked_at` | TIMESTAMP | NULL | **Audit** — when recorded |
| `remarks` | VARCHAR(500) | NULL | Note, e.g. "Arrived 10 min late" |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Audit timestamps |
| — | — | **UNIQUE** `uk_attendance_player_session` (`player_id`, `session_id`) | One attendance row per player per session → **natural key; bulk save is an upsert** |

#### `player_evaluations`

| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PK — `eval_id_seq` | Surrogate key |
| `player_id` | BIGINT | NOT NULL, FK → `players.id`, `ON DELETE CASCADE` | Athlete |
| `session_id` | BIGINT | NOT NULL, FK → `training_sessions.id`, `ON DELETE CASCADE` | Session |
| `technical_score` | INT | NULL, `CHECK 1–10` | Skill rating |
| `physical_score` | INT | NULL, `CHECK 1–10` | Fitness rating |
| `attitude_score` | INT | NULL, `CHECK 1–10` | Team-play rating |
| `comments` | VARCHAR(1000) | NULL | Free-text evaluation |
| `evaluation_date` | DATE | NULL | When evaluated |
| `evaluated_by` | BIGINT | NULL, FK → `users.id`, `ON DELETE SET NULL` | **Audit** — who evaluated |
| `created_at` / `updated_at` | TIMESTAMP | NOT NULL | Audit timestamps |
| — | — | **UNIQUE** `uk_eval_player_session` (`player_id`, `session_id`) | One evaluation per player per session |

> **Domain status note:** `player_evaluations` is **fully modeled** (entity + repository + Flyway migration) but **exposed by no REST controller**. It is persisted-capable and available for `PlayerEvaluationRepository` (`findByPlayerId`, `findByPlayerIdAndSessionId`) but has zero API surface or UI today. Treat it as a reserved capability.

### 2.3 Data Lifecycle

**Soft deletes (preferred stop-state):**
- `sports.active` — deactivation removes a sport from `findAllActive()`, `/api/sports/my`, and the captain's scoping queries, while preserving its rows.
- `players.active` — `PlayerService.deactivate()` flips the flag; roster/attendance UI renders `ACTIVE`/`INACTIVE` badges. **However**, no code path currently invokes `deactivate()`; the UI uses hard delete instead.
- `users.enabled` — account disable. `CustomUserDetailsService` maps `disabled(!user.isEnabled())`, so a disabled user is rejected at authentication time. Used by the Admin "Disable/Enable" toggle.

**Hard deletes (`DELETE` endpoints):**
- `DELETE /api/sports/{id}` — cascades to `players`, `training_sessions`, `attendances`, `player_evaluations`, and join rows in `sport_captains`. The UI confirms this ("its roster … attendance history").
- `DELETE /api/players/{id}` — cascades `attendances` + `evaluations`. The UI confirms this.
- `DELETE /api/sessions/{id}` — cascades its `attendances`.
- `DELETE /api/users/{id}` — removes the account; upstream FK references are `SET NULL` (historical `marked_by`/`evaluated_by` preserved) and captainship join rows cascade away.

**Auditing:**
- Row-level `created_at`/`updated_at` on every table (JPA `@AuditingEntityListener`).
- **Actor audit:** `attendances.marked_by`/`marked_at` snapshot the recording user at write time — history survives later captain reassignment or deletion; `player_evaluations.evaluated_by` does the same.
- **No read/access audit log** exists; monitoring is limited to API-level observations.

**Archiving:** No explicit archival job exists. Guardrails today are referential-integrity cascades plus soft `active` flags. Extrapolated standard pattern for growth: a scheduled job (e.g. Spring `@Scheduled`) that moves `attendances` older than a configurable horizon into a read-only `attendances_archive` partition, preserving the `(player_id, session_id)` natural key.

---

## 3. End-to-End Request Data Flow

### 3.1 Request Cycle Steps (Generic)

```
 [1] Client (React SPA / curl)
        │  HTTP request + Authorization: Basic base64(user:pass)
        ▼
 [2] Spring Security Filter Chain
        • CorsFilter  — allows origins :5173/:5174, methods GET/POST/PUT/PATCH/DELETE/OPTIONS, credentials, MAX-AGE 3600
        • SecurityContextPersistenceFilter — binds session
        • BasicAuthenticationFilter — decodes Basic header →
            DaoAuthenticationProvider → CustomUserDetailsService.loadUserByUsername()
              → UserDetails{authorities=[ROLE_ADMIN | ROLE_CAPTAIN], disabled=!enabled}
              → BCrypt compare (password_hash)
        • If 401 (bad creds / disabled user) → WWW-Authenticate: Basic challenge, no controller invoked
        ▼
 [3] AuthorizeHttpRequests (URL-level gate)
        • /api/**            → authenticated()
        • /admin/**          → hasAuthority('ROLE_ADMIN')
        • /captain/**        → hasAuthority('ROLE_CAPTAIN')
        • /login, /actuator/*→ permitAll()
        • CSRF ignored for /api/**; form login CSRF active for MVC pages; max 1 session per user
        ▼
 [4] Method-level gate — @PreAuthorize on controller methods (e.g. hasAnyRole / hasAuthority)
        ▼
 [5] Controller — manual object-level scope check (captain belongs to the target sport?)
        • isCaptainOfSport / isCaptainOfSession / isCaptainOfPlayer
        • Returns 403 (ResponseEntity status) or throws AccessDeniedException otherwise
        ▼
 [6] Service — transactions (@Transactional), business rules, repository calls
        ▼
 [7] Repository → JPA/Hibernate → JDBC → PostgreSQL (Supabase pooler)
        ▼
 [8] Response object mock → Jackson serialization (computed getters expose playerId/sessionId/sportId/playerFullName)
        ▼
 [9] HTTP response → axios interceptor (401 ⇒ clear sessionStorage ⇒ redirect /login) → TanStack Query cache
```

### 3.2 Sequence Mappings for Key Operations

#### A. Authentication / Login (SPA)

| Step | Actor → Actor | Detail |
| :--- | :--- | :--- |
| 1 | `LoginPage` → `useAuth.login()` | Client builds `Basic base64(username:password)` locally **before any backend call** |
| 2 | Client → `/api/auth/me` | `GET` with `Authorization: Basic …`; expects 200 |
| 3 | Filter chain | BasicAuthenticationFilter authenticates via `CustomUserDetailsService`, granting `ROLE_ADMIN` or `ROLE_CAPTAIN` |
| 4 | `AuthApiController.getCurrentUser()` | Resolves `user = userService.findByUsername(auth.getName())` |
| 5 | Payload transform | Controllers emit `{id, username, fullName, email, phone, role, enabled}`; if captain, inject `sports[]` = `[{id,name}…]` (via `sportService.findByCaptainId`) plus convenience `sportId`/`sportName` of first sport |
| 6 | Client | On success stores `{token, username, fullName, role, id, …}` in **`sessionStorage['auth']`**; sets React role state; redirects `/dashboard`. **Fallback path** (legacy server): probe `/api/sports`, then probe `/api/users/captains` (200 ⇒ admin) |
| 7 | Failure handling | 401 ⇒ throw "Invalid username or password"; frontend shows inline error, no state persisted |

#### B. Captain reads roster (scoped read)

| Step | Detail |
| :--- | :--- |
| 1 | Client (RosterPage) calls `useMySports()` → `GET /api/sports/my` |
| 2 | `SportApiController.listMySports` → `PlayerService.findCaptainSports(user)` — **admin ⇒ all active; captain ⇒** bridge user→player via email (`findByEmail`) then `sportRepository.findByCaptainId(playerId)` (JPQL `JOIN FETCH captains WHERE c.id=:captainId`) |
| 3 | RosterPage auto-selects first sport → `GET /api/sports/{sportId}/players` |
| 4 | `PlayerApiController.listBySport` → `isCaptainOfSport(user, sportId)` (player-based via email bridge); captain not assigned ⇒ **403**; admin ⇒ pass |
| 5 | `PlayerService.findAllBySport` → `PlayerRepository.findBySportId` → `JOIN p.sports` — the distinct players whose `player_sports` membership includes that sport |

#### C. Bulk attendance submission (captain marks registers)

| Step | Detail |
| :--- | :--- |
| 1 | Client (AttendancePage) sends `POST /api/sessions/{sessionId}/attendance` body `{"records":[{"playerId":1,"status":"PRESENT"}…]}` |
| 2 | `@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")` — role gate |
| 3 | `AttendanceApiController.saveAttendance` → loads `me`, `session`; **`isCaptainOfSession`** check ⇒ unauthorized captains get `AccessDeniedException` (403) |
| 4 | Controller coercion: `status` is `AttendanceStatus.valueOf(...)`; bad enum ⇒ 400 |
| 5 | `AttendanceService.saveAttendance` (transactional) — **upsert keyed on `(player_id, session_id)`**: `findByPlayerIdAndSessionId(...).orElseGet(new Attendance)`; sets `status`, `markedBy=me`, `markedAt=now()`, saves |
| 6 | Empty/absent `records` ⇒ no-op; response `204 No Content` |
| 7 | Client cache invalidation: invalidates `['sessions', sessionId, 'attendance']` and all `['sessions'…]` keys → UI summary (`present/late/absent/total`) recomputes |

#### D. Admin creates a captain account

| Step | Detail |
| :--- | :--- |
| 1 | Client (AdminPage) → `POST /api/users` body `{username, password, fullName, email, phone, role:'ROLE_CAPTAIN'}` |
| 2 | `UserApiController` is **class-level `@PreAuthorize("hasAuthority('ROLE_ADMIN')")`** — non-admin → 403 before method |
| 3 | Controller validates username/password/fullName presence → `400 {message}` on miss |
| 4 | `UserService.createUser` → **uniqueness guard** `existsByUsername` ⇒ `DuplicateResourceException` (409); bcrypt-encodes password; sets `enabled=true` |
| 5 | Persist `User{role=ROLE_CAPTAIN}`; returns `201` + serialized user (password never serialized — `@JsonIgnore`) |
| 6 | Client invalidates `['captains']` query; captain now assignable to a sport (§ E) |

#### E. Promote / demote a player ↔ captain (privileged lifecycle)

Captaincy attaches to the **player** (`sport_captains.player_id`). Two promotion paths exist:

**Path 1 — player-centric promotion (admin *and* the sport's own captains):**
`POST /api/sports/{sportId}/captains/{playerId}`. `@PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')")`; the controller then checks `isCaptain(me, sportId)` (admin short-circuits), verifies the player is a member of the sport (via `player.sports`), and calls `SportService.assignCaptain`. **Enforces ≤3 captains per sport and ≤1 sport per captain** (the latter also backed by `uk_captain_single_sport`). Responses: `200 {sportId, playerId, message}`; `400` if the player captains another sport or already at capacity. This path does **not** create a login account.

**Path 2 — legacy admin promote-with-account:**
`POST /api/sports/{sportId}/players/{playerId}/promote-captain`, `@PreAuthorize("hasAuthority('ROLE_ADMIN')")`. `PlayerService.promoteToCaptain` resolution ladder: **(1)** reuse existing `ROLE_CAPTAIN` user by typed username; **(2)** reuse a captain account previously auto-created from the player's email; **(3)** else create a new `ROLE_CAPTAIN` user (fullName/email/phone seeded from the player row) — then calls `assignCaptain`. The `users` login account and the `sport_captains` row are kept consistent via the shared email.

**Demote (reverse):** `POST /api/sports/{sportId}/players/{playerId}/demote` (admin) → `PlayerService.demoteFromCaptain` → `SportService.removeCaptain(sportId, playerId)` removes the `sport_captains` join row only; the `users` account (if any) survives. `DELETE /api/sports/{id}/captain/{captainId}` (admin) is the equivalent remove-by-player-id endpoint. (The Phase-1 rewrite fixed a defect where demotion passed the wrong id and no-op'ed.)

### 3.3 Payload Transformations (Jackson projections)

| Entity | Exposed computed DTO fields | Hidden fields |
| :--- | :--- | :--- |
| `Player` | `sports[]` (`Set<Sport>`), `department`, computed `sportId` (`@JsonProperty`, first sport — display hint only) | `attendances`, `evaluations` (`@JsonIgnore`); nested `Sport` values stripped of `players`/`captains`/`trainingSessions` (`@JsonIgnoreProperties`) |
| `TrainingSession` | `sportId` | `attendances` (`@JsonIgnore`) |
| `Attendance` | `playerId`, `sessionId`, `playerFullName` (computed) | `player`, `session`, `markedBy` full graphs (`@JsonIgnoreProperties` → flattened to IDs) |
| `Sport` | `captains[]` as **player** values (`@JsonIgnoreProperties` on the `Player` side) | `players`, `trainingSessions` collections (`@JsonIgnore`); `getPrimaryCaptain()` (`@JsonIgnore`) |
| `User` | all fields | `passwordHash` (`@JsonIgnore`) |

Plus a dedicated DTO read-model, `GET /api/players/{id}/profile`, returns `PlayerProfileDTO` — a flattened `{id, fullName, email, phone, department, isCaptain, captainOfSport, sports[]}`. `GET /api/sports/overview` returns `SportOverviewDTO` rows `{id, name, description, active, totalPlayers, captains[]}`.

Result: the API is already a **read-model with field reduction** — nested graphs are flattened to scalar IDs in transit, keeping payloads small and avoiding lazy-loading serialization errors.

### 3.4 Error-Handling Posture

There is **no `@ControllerAdvice` / `@ExceptionHandler`** class. Failure mapping is:
- `@ResponseStatus` on the two custom exceptions — `DuplicateResourceException` → **409**, `ResourceNotFoundException` → **404**.
- **Inline** `ResponseEntity` status handling in each controller (400/401/403/404/409) with ad-hoc `{message}` bodies.
- Auth failures are handled by the Spring Security filter chain (401 for Basic; `/login?error` redirect for form login); `AccessDeniedException` surfaces as 403.
- Spring Boot's default `/error` handler is the only catch-all fallback (whitelabel disabled).

Recommended production hardening: introduce a `@RestControllerAdvice` emitting a uniform error envelope `{status, title, detail, timestamp}` (the shape `backend/README.md` already documents), and add Bean Validation on request DTOs.

---

## 4. Authorization & RBAC Framework

### 4.1 Role Definitions

| Role (`users.role`) | Persona | System entitlement |
| :--- | :--- | :--- |
| `ROLE_ADMIN` | System Administrator(s) | **Global.** Every domain entity, every sport, every captain. Sole owner of identity administration (create/edit/disable/delete users, reset passwords, assign/remove captains, promote/demote player→captain, sport CRUD + lifecycle). Seed account `admin / admin123` (bcrypt) is bootstrapped by `V2__seed_data.sql`. |
| `ROLE_CAPTAIN` | Captain / Coach | **Scoped.** Operates **only** on sports where they appear — **as a player** — in `sport_captains` (≤3 per sport, `SportService`). Can read their assigned programs, their rosters, sessions, attendance; can register athletes, create/update/delete sessions, record attendance, and **promote/demote player-captains within their own sport** (`POST /api/sports/{sportId}/captains/{playerId}`). Cannot access user administration, other sports, or global lists beyond their scope. |

No third "player" identity exists in the system — athletes exist as `players` records without login credentials. Captaincy is **player-based** (`sport_captains.player_id`): a promoted athlete becomes a player-captain while remaining a `players` row. In the interim model a `ROLE_CAPTAIN` `users` login account is still the way a captain signs in, kept consistent with their player row via the shared email column — see the hardening note §4.4 #6.

### 4.2 Permissions Catalog (atomic)

| Permission | Endpoint(s) | Enforcement |
| :--- | :--- | :--- |
| `sport:read` | `GET /api/sports`, `GET /api/sports/active`, `GET /api/sports/{id}`, `GET /api/sports/my` | Authenticated + object-level scoping (captain ⇒ own sports only) |
| `sport:create` | `POST /api/sports` | `@PreAuthorize ROLE_ADMIN` |
| `sport:update` | `PUT/PATCH /api/sports/{id}` | `@PreAuthorize ROLE_ADMIN` |
| `sport:delete` | `DELETE /api/sports/{id}` | `@PreAuthorize ROLE_ADMIN` |
| `sport:cptn:assign` | `POST /api/sports/{id}/captain` (body `{captainId: <playerId>}`) | `@PreAuthorize ROLE_ADMIN` |
| `sport:cptn:remove` | `DELETE /api/sports/{id}/captain/{captainId}` (player id) | `@PreAuthorize ROLE_ADMIN` |
| `sport:cptn:promote` | `POST /api/sports/{sportId}/captains/{playerId}` | `@PreAuthorize hasAnyAuthority('ROLE_ADMIN','ROLE_CAPTAIN')` + `isCaptain(me, sportId)` |
| `player:read` | `GET /api/sports/{sportId}/players`, `GET /api/players/{id}`, `GET /api/players/{id}/profile` | Authenticated + captain-of-sport/player scope |
| `player:read:all` | `GET /api/players` | Admin (all) / captain (own sports only) |
| `player:create` | `POST /api/sports/{sportId}/players`, `POST /api/players` | Admin or Captain + captain-of-sport (body: `sportIds[]` + `department`) |
| `player:update` | `PUT /api/players/{id}` | Admin or Captain + captain-of-player (optional `sportIds[]` replaces memberships) |
| `player:delete` | `DELETE /api/players/{id}` | Admin or Captain + captain-of-player |
| `player:promote` | `POST …/promote-captain` (legacy admin, creates login) | `@PreAuthorize ROLE_ADMIN` |
| `player:demote` | `POST …/demote` (legacy admin) | `@PreAuthorize ROLE_ADMIN` |
| `sports:overview` | `GET /api/sports/overview` | `@PreAuthorize ROLE_ADMIN` |
| `session:read` | `GET /api/sessions`, `GET /api/sports/{sportId}/sessions`, `GET /api/sessions/{id}` | Authenticated + captain-of-sport/session scope |
| `session:create` | `POST /api/sports/{sportId}/sessions` | Admin or Captain + captain-of-sport |
| `session:update` | `PUT /api/sessions/{id}` | Admin or Captain + captain-of-session |
| `session:status` | `PATCH /api/sessions/{id}/status` | Admin or Captain + captain-of-session |
| `session:delete` | `DELETE /api/sessions/{id}` | Admin or Captain + captain-of-session |
| `attendance:read` | `GET /api/sessions/{sessionId}/attendance`, `GET /api/players/{playerId}/attendance` | Authenticated + captain-of-session/player scope |
| `attendance:record` | `POST /api/sessions/{sessionId}/attendance` | Admin or Captain + captain-of-session |
| `attendance:update` | `PATCH /api/attendance/{id}` | Admin or Captain *(see hardening notes)* |
| `member:read` | `GET /api/users/captains`, `GET /api/users/{id}` | `@PreAuthorize ROLE_ADMIN` |
| `member:create` | `POST /api/users` | `@PreAuthorize ROLE_ADMIN` |
| `member:update` | `PATCH /api/users/{id}` | `@PreAuthorize ROLE_ADMIN` |
| `member:password` | `PATCH /api/users/{id}/password` | `@PreAuthorize ROLE_ADMIN` |
| `member:toggle` | `PATCH /api/users/{id}/toggle` | `@PreAuthorize ROLE_ADMIN` |
| `member:delete` | `DELETE /api/users/{id}` | `@PreAuthorize ROLE_ADMIN` |
| `profile:self` | `GET/PATCH /api/auth/me` | Any authenticated user, **self only** (username resolved from `Authentication`) |

### 4.3 Access Control Matrix

Legend: **C** = Create, **R** = Read, **U** = Update, **D** = Delete. "Owned sport" = sport in the user's `sport_captains` set.

| Role | Entity / Resource | C | R | U | D | Scope / Conditions |
| :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| **ADMIN** | Sports | ✔ | ✔ | ✔ | ✔ | Global — all programs |
| **ADMIN** | Sport captains (assign/remove) | ✔ | ✔ | ✔ | ✔ | Global; ≤3/sport |
| **ADMIN** | Players | ✔ | ✔ | ✔ | ✔ | Global — every sport |
| **ADMIN** | Training sessions | ✔ | ✔ | ✔ | ✔ | Global |
| **ADMIN** | Attendance | ✔ | ✔ | ✔ | ✔ | Global (reads + records as any captain) |
| **ADMIN** | Captains/Users (accounts) | ✔ | ✔ | ✔ | ✔ | Global only — sole role with `member:*` |
| **ADMIN** | Own profile | — | ✔ | ✔ | — | Self (`/api/auth/me`) |
| **CAPTAIN** | Sports | — | ✔ | — | — | Only sports where `sport_captains` contains them (as a player); `GET /api/sports` (unscoped) and `/active` do leak all names |
| **CAPTAIN** | Sport captains | — | ✔ | ✔ | ✔ | **Read**, plus promote/demote player-captains **within an owned sport** only (`POST /api/sports/{sportId}/captains/{playerId}`); cannot assign/remove in other sports |
| **CAPTAIN** | Players | ✔ | ✔ | ✔ | ✔ | Only players with a `player_sports` membership in an owned sport (multi-sport owners are in scope for **each** owned sport) |
| **CAPTAIN** | Training sessions | ✔ | ✔ | ✔ | ✔ | Only sessions whose `sport` is an owned sport |
| **CAPTAIN** | Attendance | ✔ | ✔ | ✔ | ✔ | Session/player must belong to owned sport |
| **CAPTAIN** | Users/Accounts | — | — | — | — | **No access** (all `member:*` are admin-only) |
| **CAPTAIN** | Own profile | — | ✔ | ✔ | — | Self; password change requires current password |

**Two-layer enforcement model (defense in depth):**
1. **Role gate** — `@PreAuthorize` (method) + `authorizeHttpRequests` (URL) filter.
2. **Ownership gate** — hand-rolled `isCaptainOfSport/Session/Player` helpers inside controllers, resolving the **current player** from `Authentication` via the shared-email bridge (`PlayerService.findByEmail(user.getEmail())`) and testing `player.sports` membership (`Sport.hasCaptainByPlayerId(playerId)`); admins short-circuit to `true`. Denied ⇒ 403 (`ResponseEntity.status(FORBIDDEN)` or `AccessDeniedException`). Multi-sport membership means the check resolves per-sport: a player-captain in sport A is in scope for sport A only.

### 4.4 Hardening Observations (derived from code inspection)

| # | Gap | Recommended Production Pattern |
| :-: | :--- | :--- |
| 1 | `PATCH /api/attendance/{id}` is role-gated but **not ownership-gated** — any captain can edit an attendance row in another sport's session | Add `isCaptainOfPlayer(Session)` scope check, mirroring `saveAttendance` |
| 2 | `GET /api/players/{playerId}/attendance/summary` performs **no scope check** — any authenticated user can query any athlete's presence count | Apply the same captain-of-player guard |
| 3 | `GET /api/sports` (plain `listAll`) and `GET /api/sports/active` return **all sports** regardless of role (the frontend compensates by using `/my` for captains) | Either scope `listAll` by captain ownership or restrict the unscoped list to admins |
| 4 | Deleting a **sport** transactionally destroys athletes, sessions, and all attendance history (cascade) with only a client-side confirmation | Prefer soft-delete (`active=false`) + archive, or a two-step confirm with server-side guard when the sport has activity |
| 5 | Basic-auth credentials are re-encoded and stored **recoverably** in `sessionStorage` (XSS-readable); no server-side session for the SPA | Migrate to token/session auth (e.g. Spring Session + cookie or JWT) and `Secure` storage |
| 6 | **Interim captain auth is bridged by email, not identity** — a captain's `sport_captains` row points at a `player_id`, but sign-in and `marked_by`/`evaluated_by` auditing use a separate `users` row linked only via a shared `email` column (case-insensitive match). The two records can drift: editing the player's email orphans the bridge, deleting the `users` account silently removes the captain's login while leaving the captaincy, and two players sharing an email would collide. Related side-effect of the multi-sport model: `uk_player_jersey_sport` was dropped, so jersey numbers are no longer unique | Replace with real player-bound authentication — give `players` a credential (password hash on the player row, or a `player_credentials` table) so `sport_captains` and the login principal share one identity. Until then, treat `email` as the authoritative join key and enforce uniqueness across `players.email`; add an integration test asserting a demoted player's `sport_captains` row disappears |
| 7 | `RoleGuard` renders `children` before the role check resolves — a wrong-role user **briefly sees admin UI** before being redirected | Render `null` until the role check completes (backend 403 stays authoritative) |
| 8 | No `@ControllerAdvice` — inconsistent error shapes across controllers | Add a `@RestControllerAdvice` with a uniform error envelope |

> Implemented RBAC is **positive enforcement** (allow-lists). Session-fixation, CSRF (disabled for `/api/**`), and 1-session-per-user limits are already handled by Spring Security defaults.

---

## 5. View & UI Content Exposure Matrix

### 5.1 Route & Navigation Map

| Route | Screen | `ROLE_ADMIN` | `ROLE_CAPTAIN` | Guard mechanism |
| :--- | :--- | :---: | :---: | :--- |
| `/login` | Sign-in (brand panel + form) | ✔ | ✔ | `PublicRoute` — redirects to `/dashboard` if already authenticated |
| `/dashboard` | Executive overview | ✔ | ✔ | `AuthRoute` (authenticated) |
| `/roster` | Athletes & sport rosters | ✔ | ✔ | `AuthRoute` |
| `/attendance` | Attendance Register | ✔ | ✔ | `AuthRoute` |
| `/profile` | My Profile | ✔ | ✔ | `AuthRoute` |
| `/admin` | Administration | ✔ | ✗ | **Route-level** `RoleGuard requiredRole="ROLE_ADMIN"` + backend 403 |
| `*` | 404 | ✔ | ✔ | `NotFoundPage` |

**Sidebar (`Sidebar.tsx`):** nav items carry `requiredRole`; the *"Admin"* item is set to `ROLE_ADMIN`, so it is dropped from a captain's menu. The sidebar also renders the role label (`Administrator` vs `Captain`), and the `Header` swaps the portal title (`Administration Portal` vs `Captain Portal`) plus an `ADMIN`/`CAPTAIN` chip. **Defense in depth:** nav hiding is cosmetic — URL-level `RoleGuard` and server `@PreAuthorize`/scope checks remain authoritative.

### 5.2 Field-Level Visibility & UI Controls

#### Global / shared screens

| Screen | Control / Field | `ROLE_ADMIN` | `ROLE_CAPTAIN` |
| :--- | :--- | :--- | :--- |
| **Dashboard** | Sports stat card | "Sports Programs" (all) | "My Assigned Sports" (own count) |
| | Coaches & Captains stat | Real captain count + list | Fixed `1` ("Your coach account") — **captain roster counts hidden** |
| | Sessions table | All sports' upcoming sessions | Only owned sports' upcoming sessions (client-side filter `mySportIds`) |
| **Roster** | Sport selector | **Dropdown** over all sports | **Fixed label** "Your Assigned Sport" — no selector |
| | Coach display | — | Shows the sport's captain(s) as **player names** — `currentSport.captains[].fullName` (or "Unassigned") |
| | Roster actions | Register / Edit / Delete athlete | Register / Edit / Delete **within owned sport** (backend permits Captain+scope) |
| | Athlete details sheet | Full contact (incl. **department**) + DOB + notes + attendance history; **profile view** shows `isCaptain` badge + sport-program chips (from `GET /api/players/{id}/profile`); **Promote** button for members | Same — scoped athlete; captain badge/sport chips identical for a multi-sport owner |
| | Add / Edit athlete dialog | `sportIds[]` **multi-select** of programs + department field (primary sport locked-in for add) | Same within owned sport(s); at least one sport required |
| **Attendance** | Sport selector | Dropdown | Fixed label (own sport) |
| | "Schedule Session" | ✔ | ✔ (allowed for captains of the sport — `session:create`) |
| | "Delete Session" | ✔ | ✔ (captains may delete — `session:delete`, scoped) |
| | Status grid | `PRESENT / LATE / ABSENT / EXCUSED` pills + live summary counts | Identical, scoped to own session |
| **Profile** | Contact details (fullName/email/phone) | ✔ editable | ✔ editable |
| | Change password (current + new) | ✔ (min 6 chars, confirmation) | ✔ — client re-encodes new Basic token into `sessionStorage` so the session survives the rotation |
| **Login** | Branding | "University Athletics / Sports Camp Attendance System"; footer "Authorized personnel only. All activity is monitored." | identical |

#### Administration screen (`/admin` — **admin-only route**)

| Module | Control | Exposure |
| :--- | :--- | :--- |
| **Captains & Coaches tab** | Create captain account | Fully editable — username, temporary password, full name, email, phone |
| | Captain table | Full contact (`@username`, email, phone), assigned-sport badge, ACTIVE/INACTIVE status |
| | Row actions | Assign Sport, Edit, Reset Password, **Disable/Enable**, Delete |
| | "Promote Player to Captain" | Global player search → pick sport → confirm with chosen credentials (capped at 3 captains/sport, UI shows `x/3` counter and disables the button at saturation) |
| **Sports Programs tab** | Create sport, activate/deactivate, delete | Exclusive |
| | Captains/Admins per sport | Add/Remove with live `x / 3` slot counter; "Add Admin" disabled when full or when zero captains exist |
| | Expandable player section | View per-sport roster inline with **Edit / Promote / Demote** per athlete |
| | Demote | Removes the captain-sport association (`sport_captains` join row) by **player id**; the `users` login account (if any) survives — Phase-1 fix corrected the demote path |
| | Assign Sport / Add Admin | Sources candidates from **`players`**, not User captain accounts; assigns `captainId: <playerId>` (≤3/sport, ≤1 sport per captain) |

**What a captain never sees in any screen:** the Admin nav item, `/admin` route, captain/account management, captain-to-sport assignments, cross-sport data, global sport/session/player lists beyond owned scope, and user-direct endpoints (`/api/users/**`). Field reduction on the wire (all rows shaped at the controller/repository, sensitive nested graphs `@JsonIgnore`d) backs the UI hiding at the API layer.

---

## Appendix A — Context Notes

- **React Query wiring** (`main.tsx`): `staleTime 5 min`, `retry: 2`, `refetchOnWindowFocus: false`; mutations invalidate exact namespaced keys (`['sports', sportId, 'players']`, `['sessions', sessionId, 'attendance']`) or broad predicates (`q.queryKey[0] === 'sessions'`).
- **No React Context / provider** for auth: `useAuth` hook + `sessionStorage` is the entire auth layer.
- **Client-persisted username map** ("Already captain" detection in the promote dialog) matches player emails against captain stored usernames.
- **Dead/unreferenced code paths** (no controller caller): `PlayerService.findActiveBySport`/`deactivate` (the UI hard-deletes instead of deactivating), `PlayerRepository.countBySportIdAndActiveTrue`, `AttendanceRepository.countPresentBySport`, `TrainingSessionRepository.findBySportIdAndSessionDateBetween`, and the entire `player_evaluations` API surface. (`SportService.findByCaptainUsername` was removed in the player-centric refactor — captaincy queries now go through `sportRepository.findByCaptainId`.)