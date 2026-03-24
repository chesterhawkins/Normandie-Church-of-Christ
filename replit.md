# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) - Normandie Church of Christ app

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── southside-church/   # Expo mobile app (main app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, scripts)
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Normandie Church of Christ Mobile App

React Native (Expo) mobile app for Normandie Church of Christ.

### Technology

- **Frontend**: React Native (Expo Router file-based routing)
- **Authentication**: Firebase Authentication (email/password)
- **Database**: Firebase Firestore (existing database)
- **Storage**: Firebase Storage (bulletin PDFs, announcement images)

### Firebase Configuration

Firebase credentials are stored as secrets and passed as `EXPO_PUBLIC_` env vars in the dev script:
- `FIREBASE_API_KEY` → `EXPO_PUBLIC_FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN` → `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID` → `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET` → `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID` → `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID` → `EXPO_PUBLIC_FIREBASE_APP_ID`

### Firestore Collections (PascalCase)

- `Announcement` — text, sender (UID), createdAt, imageUrl?, imageName?
- `Bulletin` — date (Timestamp), url (string), shortUrl?
- `PrayerRequest` — text, visibility, createdAt, createdBy, createdByName, prayedBy[]
- `User` — email, firstName, lastName, middleName?, phone?, profilePicUrl?, type ("Admin"|"Leader"|"Member")

### User Roles

- **Member**: View announcements, bulletins, prayer (member-visible), directory. Create/delete own prayer requests.
- **Leader/Admin**: All member actions + create announcements, upload/delete bulletins, view all prayer requests, delete any content.
- `isLeader`/`isAdmin` checks use `type.toLowerCase()` for case-insensitive comparison.

### App Structure

```
artifacts/southside-church/
├── app/
│   ├── _layout.tsx          # Root layout with providers (Auth, QueryClient)
│   ├── (auth)/              # Auth modal (login, register)
│   └── (tabs)/              # Tab navigation
│       ├── index.tsx         # Home (verse of day, YouTube, Cash App/Zelle giving, login CTA)
│       ├── announcements.tsx # Announcements (link detection, video embeds, OG previews)
│       ├── bulletins.tsx     # Bulletins/PDFs (date picker, inline WebView viewer)
│       ├── prayer.tsx        # Prayer requests (auth required)
│       ├── directory.tsx     # Member directory (auth required)
│       ├── calendar.tsx      # Google Calendar (WebView)
│       ├── bible.tsx         # Bible app (WebView - biblewebapp.com)
│       └── more.tsx          # About/contact info + account
├── components/
│   ├── ErrorBoundary.tsx
│   ├── ErrorFallback.tsx
│   ├── LinkPreview.tsx      # OG preview card (fetches from API server)
│   ├── Modal.tsx
│   └── VideoEmbed.tsx       # YouTube/Vimeo inline player (WebView)
├── context/
│   └── AuthContext.tsx      # Firebase auth state + user role + fullName() helper
├── services/
│   ├── firebase.ts          # Firebase initialization
│   ├── announcements.ts     # Firestore CRUD + sender UID→name resolution
│   ├── bulletins.ts         # Firestore + Storage CRUD (date-based path: bulletins/MM-dd-yyyy.pdf)
│   ├── prayer.ts            # Firestore CRUD for prayer requests
│   └── directory.ts         # Firestore read for member directory
├── utils/
│   └── linkDetection.ts     # URL extraction, YouTube/Vimeo/link classification
└── constants/
    └── colors.ts            # Royal blue (#1E3A8A) + gold (#C9A840) theme
```

### API Server

Express 5 server at `artifacts/api-server/` serving at `/api` prefix (port 8080).

Key routes:
- `GET /api/healthz` — Health check
- `GET /api/og-preview?url=...` — Open Graph metadata fetcher (SSRF-hardened: blocks private IPs, localhost, metadata endpoints; 1MB response limit; 5s timeout)

### Announcement Link Previews

Announcements auto-detect URLs in text:
- **YouTube/Vimeo links** → inline video embed via WebView (16:9 aspect ratio)
- **Other links** → OG preview card (thumbnail, title, description) fetched via API server
- **All URLs** → rendered as tappable blue links in text body
- Only the first URL in an announcement gets a preview/embed
- Client-side URL classification uses host-anchored checks (not substring regex)

### Navigation

- **Logged Out**: Home, News, Bulletins, More, Bible, Calendar
- **Logged In**: Home, News, Bulletins, Prayer, Directory, More, Bible, Calendar
