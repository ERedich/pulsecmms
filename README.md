# Pulse

CMMS mit Fokus auf Web und Mobile. Grundgerüst mit Login, Benutzer-, Kostenstellen- und Mitarbeiterverwaltung für den eigenen Hauptmandanten und Mandantenverwaltung.

Entscheidungen und Regeln: [guidelines.md](guidelines.md) · Ist-Schnitt Web/API/DB: [slice.md](slice.md)

## Stack

- `apps/web` – Vite, React, Tabler Icons (Login, Benutzer, Mandanten, Kostenstellen, Mitarbeiter)
- `apps/mobile` – Expo (React Native), Tabler Icons
- `apps/api` – NestJS, `pg`, Auth, User-CRUD, Site-CRUD, Cost-Center-CRUD, Employee-CRUD
- Postgres auf dem NAS, Datenbank `pulse_dev` (Port 41631)

## Setup

```bash
pnpm install
cp .env.example .env
# Passwort und ggf. EXPO_PUBLIC_API_URL eintragen
cp .env apps/api/.env
```

Datenbank anlegen und Schema:

```bash
pnpm db:create
pnpm db:migrate
pnpm db:seed
```

Demo-Logins: `m.weber` / `PulseDemo1!` · `admin` / `admin`

Starten:

```bash
pnpm dev:api
pnpm dev:web
# Mobile startet der Mensch:
pnpm dev:mobile
```

- Web: `http://localhost:5173/login` · Benutzer: `/users` · Mandanten: `/sites` · Kostenstellen: `/cost-centers` · Mitarbeiter: `/employees`
- API: `http://0.0.0.0:3010/api/health`
