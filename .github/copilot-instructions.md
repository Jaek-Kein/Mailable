# Copilot Instructions: Mailable Event Auto-Mailing

## Project Overview
Event management system for automated mailing with Google Sheets integration. Built with Next.js 15 (App Router), Prisma, NextAuth, and Emotion for styling. Uses Zustand for state management.

## Architecture & Data Flow

### Core Flow: Google Sheets → Database → UI
1. User provides Google Sheets URL containing event attendee data
2. `POST /api/sheets/ingest` parses URL, fetches CSV, converts to JSON
3. Data stored in `EventData.payload` (JSON field) via Prisma upsert
4. `useSheetStore` manages client-side ingestion state
5. `useEventStore` handles event list (currently mock data, should transition to API)

### Key Integration Points
- **Authentication**: NextAuth with Google OAuth (`src/lib/auth.ts`)
  - Session strategy: JWT (not database sessions)
  - User ID injected via `callbacks.session`
  - Protected routes via `middleware.ts` matcher: `/dashboard/*`, `/api/events/*`
  
- **Database**: PostgreSQL via Prisma with Neon hosting
  - `Event` → `EventData` (1:1) stores dynamic JSON payload
  - `User` → `Event` (1:N) ownership model
  - Auth tables: `Account`, `Session`, `VerificationToken` (Prisma Adapter)

- **Google Sheets Parsing** (`src/lib/gsheets/`):
  - Handles both direct export URLs and sheet viewer URLs
  - Extracts `spreadsheetId` and `gid` from URL patterns
  - Falls back to export format: `/spreadsheets/d/{id}/export?format=csv&gid={gid}`

## Critical Developer Workflows

### Development Commands
```bash
pnpm dev              # Next.js dev with Turbopack (default port 3000)
pnpm build            # Production build with Turbopack
pnpm lint             # ESLint check

# Database operations (add to package.json if needed)
npx prisma migrate dev       # Create/apply migrations
npx prisma generate          # Regenerate Prisma Client
npx prisma studio            # Browse database GUI
```

### Environment Setup
Required variables in `.env`:
- `DATABASE_URL` - PostgreSQL connection string (Neon)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials
- `NEXTAUTH_URL` - App URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` - Random string for JWT signing

### Database Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Prisma Client auto-regenerates; restart dev server if types don't update
4. Check `prisma/migrations/` for SQL files

## Project-Specific Conventions

### File Organization
- **API Routes**: `src/app/api/{resource}/route.ts` (REST-like structure)
- **Components**: `src/components/` for shared UI
- **Stores**: `src/store/use{Name}Store.ts` - Zustand pattern
- **Lib utilities**: `src/lib/{domain}/` for business logic (e.g., `gsheets/`, `auth.ts`)

### Styling Approach
- **Emotion CSS-in-JS** with theme provider
- Server-compatible setup via `EmotionRegistry` (handles SSR hydration)
- Theme defined in `src/styles/theme.ts`
- Styled components pattern: `const Card = styled.div\`...\``
- Must wrap app in `<Providers>` for theme context (see `src/app/layout.tsx`)

### Import Alias
- Use `@/` for root imports (e.g., `@/src/components/EventCard`)
- Configured in `tsconfig.json` paths

### State Management Patterns
- **Server state**: Fetch in API routes, return JSON
- **Client state**: Zustand stores with async actions
  - Example: `useSheetStore.ingestFromSheetUrl()` calls API and updates loading state
- **Mock data**: Currently in `src/data/MockEvent.json` - intended for replacement with DB queries

### API Response Convention
```typescript
// Success
{ ok: true, data: {...}, count?: number }

// Error
{ ok: false, error: "message" }
```
Always return proper HTTP status codes (400, 401, 500).

### Authentication Patterns
- Get session in API routes: `const session = await auth()`
- Check `session?.user?.id` for authorization
- Middleware auto-redirects unauthenticated users to `/login`
- Login page: `src/Login/page.tsx` (non-standard location, should be `src/app/login/page.tsx`)

## Known Issues & Gotchas

1. **Event Store Mismatch**: `useEventStore` loads mock JSON data instead of fetching from `/api/events`. Need to implement API integration.

2. **Prisma Client Location**: Generated in `node_modules/.prisma/client`, imported via `@prisma/client`. If types break, run `npx prisma generate`.

3. **Emotion SSR**: Must use `EmotionRegistry` wrapper and `'use client'` directive for styled components to avoid hydration mismatches.

4. **Middleware Scope**: Currently protects `/dashboard/*` but dashboard route doesn't exist. Adjust matcher in `middleware.ts` based on actual protected routes.

5. **Zod Validation**: Used in `/api/events` but not in `/api/sheets/ingest`. Consider consistent validation strategy.

6. **Sheet URL Formats**: Parser handles multiple Google Sheets URL patterns. Test with both editor URLs and export URLs.

## Testing Strategies
- No test framework configured yet
- Manual testing flow:
  1. Sign in with Google
  2. Create event via `/api/events` POST
  3. Ingest sheet data via EventCard click → `/api/sheets/ingest`
  4. Verify data in `EventData.payload` via Prisma Studio

## Next Steps for AI Agents
- When adding features, follow existing patterns in `src/app/api/` for endpoints
- Use Prisma schema for understanding data relationships
- Check `middleware.ts` if adding protected routes
- Reference `useSheetStore` for async action patterns
- For UI components, maintain Emotion + theme consistency
