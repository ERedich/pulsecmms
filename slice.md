# Pulse – Software-Slice (Ist-Zustand)

Vertikaler Schnitt der heutigen Software: von der Web-Oberfläche über die API bis zur Datenbank. UI-Regeln stehen in [guidelines.md](guidelines.md), Design-Tokens in [DESIGN_pulse.md](DESIGN_pulse.md).

## Rahmen

Pulse ist ein CMMS (Computerized Maintenance Management System) als Monorepo:

| App | Technologie | Stand |
| --- | --- | --- |
| `apps/web` | Vite, React, TypeScript | Login + fünf Fach-Apps |
| `apps/api` | NestJS, `pg` | Auth, CRUD, Uploads |
| `apps/mobile` | Expo (React Native) | Gerüst, kein Login |

Datenbank: Postgres `pulse_dev` auf dem NAS. Migrationen unter `apps/api/db/migrations/`. Kein ORM.

## Schichten

```mermaid
flowchart LR
  Browser["Web Browser\nVite React :5173"]
  Api["NestJS API\n/api :3010 JWT"]
  Db["Postgres\npulse_dev"]
  Files["Uploads\napps/api/uploads/assets"]

  Browser -->|"Proxy /api"| Api
  Api --> Db
  Api --> Files
```

- Der Vite-Dev-Proxy leitet `/api` nach `http://127.0.0.1:3010` weiter.
- Fachzugriff läuft über Bearer-JWT. Passwort-Hashes: argon2.
- Dateien (Asset-Thumbnails) liegen außerhalb der DB unter `apps/api/uploads/assets/` (gitignoriert).

## Querschnitt: Auth und Mandant

1. Login: `POST /api/auth/login` mit `loginName`, `password`, optional `rememberMe` → JWT + User (ohne `uid`).
2. Session prüfen: `GET /api/auth/me` (Bearer).
3. JWT trägt den Hauptmandanten als `siteUid`.
4. Sichtbar und pflegbar sind Datensätze mit `fk_site` = Hauptmandant des Aufrufers.
   - Ausnahme **Mandanten**: alle Sites.
5. `uid` bleibt intern. Navigation und Anzeige laufen über `key`.
6. Neue Datensätze erhalten `fk_site` des Aufrufers (nicht wählbar).

## Shell

Nach Login Start auf `/sites`. Sidebar aus `apps/web/src/components/layout/nav.ts`:

| Pfad | Label |
| --- | --- |
| `/sites` | Mandanten |
| `/cost-centers` | Kostenstellen |
| `/assets` | Assets |
| `/employees` | Mitarbeiter |
| `/users` | Benutzer |

Jede Fach-App folgt dem Muster **LP** (Liste) und **EP** (Anlegen/Bearbeiten):

- Liste: `/{entity}`
- Anlegen: `/{entity}/new`
- Bearbeiten: `/{entity}/:key/edit`

Router: `apps/web/src/App.tsx`. Aufbau von Optionsleiste, Tabelle, Formular und Animation: [App Guidelines](guidelines.md#app-guidelines).

## App-Schnitte

### Mandanten

| Schicht | Inhalt |
| --- | --- |
| Route | `/sites`, `/sites/new`, `/sites/:key/edit` |
| LP | Schlüssel, Name, Farbcode |
| EP | Schlüssel, Name, Farbcode (`#RRGGBB`) |
| API | `GET/POST /api/sites`, `GET/PATCH/DELETE /api/sites/:key` |
| Tabelle | `sites` (Wurzel, ohne `fk_site`) |
| Löschen | `409`, solange Referenz in `users`, `user_secondary_sites`, `cost_centers`, `employees` oder `assets` |

Alle Sites sind sichtbar und pflegbar. `colorCode` steckt auch in Auth-/User-Antworten (`SiteRef`).

### Kostenstellen

| Schicht | Inhalt |
| --- | --- |
| Route | `/cost-centers`, `/cost-centers/new`, `/cost-centers/:key/edit` |
| LP | Schlüssel, Name |
| EP | Schlüssel, Name; Mandant nur lesbar |
| API | `GET/POST /api/cost-centers`, `GET/PATCH/DELETE /api/cost-centers/:key` |
| Tabelle | `cost_centers` |
| Löschen | `409`, solange `assets.fk_cost_center` darauf zeigt |

Scope: nur `fk_site` = Hauptmandant.

### Assets

| Schicht | Inhalt |
| --- | --- |
| Route | `/assets`, `/assets/new`, `/assets/:key/edit` |
| LP | Bild, Schlüssel, Typ (Art), Typ (Eltern), Kostenstelle, Seriennummer, Hersteller |
| EP | Schlüssel, Art, Seriennummer, Hersteller, Thumbnail; Eltern-Asset, Kostenstelle; Mandant nur lesbar |
| API | `GET/POST /api/assets`, `GET/PATCH/DELETE /api/assets/:key`, Thumbnail `POST/DELETE /api/assets/:key/thumbnail`, Auslieferung `GET /api/uploads/assets/:filename` |
| Tabelle | `assets` (`type`, `fk_parent`, `fk_cost_center`, `thumbnail_path`, …) |
| Löschen | `409`, solange Kinder (`fk_parent`) existieren |

Arten (DB englisch): `location` → `building` → `area` → `assembly` → `maintenance_object`. Eltern darf gleiche oder tiefere Stufe hosten. Standort darf Wurzel sein; andere Arten brauchen ein Eltern-Asset. Scope: eigener Hauptmandant.

### Mitarbeiter

| Schicht | Inhalt |
| --- | --- |
| Route | `/employees`, `/employees/new`, `/employees/:key/edit` |
| LP | Schlüssel, Name (Vorname Nachname) |
| EP | Schlüssel, Vorname, Nachname; Mandant nur lesbar |
| API | `GET/POST /api/employees`, `GET/PATCH/DELETE /api/employees/:key` |
| Tabelle | `employees` |
| Löschen | `409`, solange `users.fk_employee` darauf zeigt |

Scope: nur `fk_site` = Hauptmandant.

### Benutzer

| Schicht | Inhalt |
| --- | --- |
| Route | `/users`, `/users/new`, `/users/:key/edit` |
| LP | Schlüssel, Login, Name, Nebenmandanten, Mitarbeiter |
| EP | Schlüssel, Login, Vorname, Nachname, Passwort (nur Anlegen bzw. optional ändern); Hauptmandant fix; Nebenmandanten; optional ein Mitarbeiter |
| API | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:key`, Optionen `GET /api/users/site-options`, `GET /api/users/employee-options` |
| Tabellen | `users`, `user_secondary_sites` |
| Löschen | eigener Account verboten; Mitarbeiter-Zuordnung 1:1 (`UNIQUE` auf `users.fk_employee`) |

Scope: nur Benutzer mit `users.fk_site` = Hauptmandant. Nebenmandanten erweitern den Zugang, sind aber nicht Default für neue Records.

## Beispiel-Durchlauf

Benutzer legt eine Kostenstelle an:

```mermaid
sequenceDiagram
  participant UI as Web EP
  participant API as NestJS
  participant DB as Postgres

  UI->>API: POST /api/cost-centers JWT
  API->>API: siteUid aus JWT
  API->>DB: INSERT cost_centers fk_site=siteUid
  DB-->>API: row
  API-->>UI: key, name
  UI->>UI: zurück zum LP
```

## Datenmodell

```mermaid
erDiagram
  sites ||--o{ users : fk_site
  sites ||--o{ cost_centers : fk_site
  sites ||--o{ employees : fk_site
  sites ||--o{ assets : fk_site
  users ||--o{ user_secondary_sites : fk_user
  sites ||--o{ user_secondary_sites : fk_secondary_site
  employees |o--o| users : fk_employee
  cost_centers ||--o{ assets : fk_cost_center
  assets |o--o{ assets : fk_parent

  sites {
    uuid uid PK
    text key UK
    text name
    text color_code
  }
  users {
    uuid uid PK
    text key
    uuid fk_site FK
    uuid fk_employee FK
    text login_name
  }
  user_secondary_sites {
    uuid uid PK
    uuid fk_user FK
    uuid fk_secondary_site FK
  }
  cost_centers {
    uuid uid PK
    text key
    uuid fk_site FK
    text name
  }
  employees {
    uuid uid PK
    text key
    uuid fk_site FK
    text first_name
    text last_name
  }
  assets {
    uuid uid PK
    text key
    uuid fk_site FK
    text type
    uuid fk_parent FK
    uuid fk_cost_center FK
    text thumbnail_path
  }
```

Konsistenzregeln und Constraints: [Datenkonsistenz](guidelines.md#datenkonsistenz).

## Bewusst nicht im Schnitt

- Mobile-Login
- Site-Umschalter
- Aufträge (Mandant vom Asset)
- Weitere CMMS-Fachmodule
- Shared-Packages

Siehe [Nächste Schritte](guidelines.md#nächste-schritte-nur-nach-absprache) in den Guidelines.
