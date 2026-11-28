# Pulse – Guidelines

Gemeinsame Entscheidungsgrundlage für das CMMS Pulse. Änderungen an diesen Regeln nur nach Absprache.

## Rollen

- **Chefentwickler (Agent):** schlägt technische Entscheidungen vor und setzt sie erst nach Absprache um. Keine eigenmächtigen Feature-, Schema- oder Architekturänderungen.
- **Prozessexperte (Mensch):** liefert fachliche Anforderungen, priorisiert und entscheidet über Prozessfragen.
- Abgesprochene Entscheidungen werden hier festgehalten.

## Arbeitsregeln

- Keine Änderungen ohne Absprache.
- Vor jeder Implementierung diese Guidelines zur Kenntnis nehmen und danach arbeiten.
- Keine Tests im Browser. Die Prüfung im Browser übernimmt der Mensch.
- Jede Datenbankentscheidung (neue Datenbank, Tabellen, Spalten, Schlüssel, Indizes, Extensions, ORM, Migrationen, Encoding-Änderungen) wird vorab geklärt und hier dokumentiert.
- Secrets und Passwörter stehen nur in gitignorierten `.env`-Dateien, nie in diesem Dokument und nie in Commits.
- Agenten starten keine Expo-/Metro-/Emulator-Instanz. Mobile wird per Typecheck geprüft; App-Starts macht der Mensch.

## Produkt

- Pulse ist ein CMMS mit Fokus auf Web- und Mobile-Nutzung.
- Aktueller Stand: Grundgerüst, Datenkonsistenz-Modell, Tabellen `sites` / `users` / `user_secondary_sites` / `cost_centers` / `employees` / `assets` (optionales Thumbnail) / `settings`, Dokumentenablage als Dateien unter `apps/api/doc` (ohne DB-Tabelle), Web-Login mit JWT, User-/Kostenstellen-/Mitarbeiter-/Asset-CRUD für den eigenen Hauptmandanten, Mandanten-CRUD für alle Sites, Dokumente für Assets, Einstellungen (Katalog + Werte). Kein Mobile-Login, kein Site-Umschalter, keine weiteren Fachmodule.

## Stack

| Bereich | Technologie |
| --- | --- |
| Monorepo | pnpm, TypeScript, Node ≥ 22.13 |
| Web | Vite, React, TypeScript, `@tabler/icons-react` |
| Mobile | Expo (React Native), `@tabler/icons-react-native`, `react-native-svg` |
| Backend | NestJS |
| Datenbankzugriff (aktuell) | Node-Paket `pg` (kein ORM) |
| Icons | [Tabler Icons](https://tabler.io/icons) |
| Design | Tokens und UI-Vorgaben in [DESIGN_pulse.md](DESIGN_pulse.md) |

Noch kein `packages/`-Ordner. Geteilte Typen erst, wenn es etwas zu teilen gibt.

## Design

Farbgebung, Typografie, Spacing und Layout-Regeln stehen in [DESIGN_pulse.md](DESIGN_pulse.md). Standardmäßig keine Cards; klare Struktur statt Karten-Layouts.

Begriffe und das vollständige Muster jeder Fach-App stehen in [App Guidelines](#app-guidelines).

## App Guidelines

Die App **Benutzer** ist die Baseline für Aufbau und Logik. Jede App folgt diesem Muster, sofern für sie nichts anderes vermerkt ist. Eine Abweichung steht ausdrücklich in diesen Guidelines; sie gilt nur für die genannte App.

Interne Namen gelten nur in Gesprächen und in diesem Dokument. Sie lösen keine Umbenennung im Code aus.

- **LP (Listpanel):** Listenansicht.
- **EP (Edit Panel):** Anlegen und Bearbeiten.
- **Optionsleiste (Option ribbon):** die Zeile mit App-Titel und Aktionen.

### Shell

- Der Inhalt liegt im `main`. Die Navbar (Suche, „Neuer Auftrag“) und die Sidebar bleiben außerhalb und stehen bei jedem Wechsel.
- `main` hat kein eigenes horizontales Padding. Der Einzug der App ist `px-3` und fluchtet mit den Zelltexten.
- Unter `lg` fährt die Sidebar ein und öffnet sich per Toggle als Overlay von links. Escape und ein Klick auf den Schleier schließen sie.
- Die Sidebar liegt über der Panel-Animation. Slide und Blur dürfen Navbar und Sidebar nicht überdecken.
- Unten in der Sidebar: Benachrichtigungen, Theme-Schalter, Benutzer, Abmelden. Der Theme-Wechsel animiert nur Farbwerte (300ms). `prefers-reduced-motion` schaltet das aus.

### Optionsleiste

- Höhe `h-16`, volle Breite, Unterkante, `px-3`, vertikal zentriert. Sie sitzt direkt unter der Navbar. Die Tabelle schließt ohne Abstand darunter an.
- Reihenfolge von links: Titelblock, senkrechter Divider, Aktionen. Ein Hinweis oder Fehler steht daneben, erneut durch einen Divider getrennt, einzeilig gekürzt, der volle Text im `title`.
- Der Titelblock ist in LP und EP gleich breit (`w-52`), damit Divider und Aktionen beim Wechsel nicht springen. Titel: `text-lg leading-6 font-semibold`. Überlanger Titel wird gekürzt.
- LP-Titel ist der Name der Entität („Benutzer“). Daneben steht die Anzahl der **sichtbaren** Datensätze in eckigen Klammern, z. B. `[12]`, baseline-bündig, `text-sm font-semibold`, gedämpfte Farbe. Während des Ladens entfällt der Count.
- EP-Titel ist „{Entität} anlegen“ oder „{Entität} bearbeiten“. Kein Count, kein Untertitel.
- **Zurück:** `IconArrowLeft` (18px, `aria-label="Zurück"`) links neben dem Titel, innerhalb des `w-52`-Blocks. Sichtbar nach einem Sprung **LP → EP** derselben App oder **App → App** (App = erstes Pfadsegment; `assets` und `asset-tree` sind zwei Apps). Klick = Browser-Zurück (`navigate(-1)`). Nicht sichtbar: erste Ansicht nach Login, nach Reload, nach Rückkehr per Abbrechen/Speichern und schließen/Zurück. Ausnahme von „keine Icon-only-Aktionen“.

### Aktionen

Eigenständige Buttons, keine Icon-only-Aktionen (Ausnahmen: Zurück in der Optionsleiste; X-Segment der Speichern-Gruppe). Höhe `h-9`, `text-sm font-semibold`, Icon 18px, `rounded`, Abstand `gap-1.5`.

- **Primary** (Neu, Speichern-Gruppe): Fläche und Rahmen in Primary, Hover `primary-container`. Nicht die Grün-/Secondary-Farbe.
- **Neutral** (Bearbeiten, Abbrechen): Outline auf `surface`, Hover `surface-container-low`.
- **Destruktiv** (Löschen): Rahmen `error/40`, Text `error`, Hover `error-container/40`.
- Deaktiviert: `opacity-50`, kein Pointer. Jeder aktive Button zeigt `cursor: pointer`. Das steht einmal global in `index.css`, nicht an jedem Button.
- **Hover-Tooltip:** Nach 500ms Hover erscheint ein kurzer Text, was der Button tut. Nicht der native `title`-Tooltip (Verzögerung nicht steuerbar). Tip verschwindet bei Leave oder Press. Styling: `text-xs`, `surface` mit Outline und leichtem Schatten, unter dem Trigger zentriert.

LP:

- **Neu** öffnet das EP zum Anlegen (Forward).
- **Bearbeiten** ist nur bei genau einer Auswahl aktiv und öffnet diese. Die Auswahlanzahl erscheint als eckiges Badge mit abgerundeten Ecken. Die Breite des Badges animiert über 200ms. Das Badge ist sichtbar, sobald mindestens eine Zeile gewählt ist.
- **Löschen** ist ab einer Auswahl aktiv. Vorher eine Bestätigung, Singular oder Plural je nach Anzahl. Danach wird die Liste neu geladen.

EP:

- **Speichern** ist eine Primary-Button-Gruppe (`SaveButtonGroup`), zwei Segmente mit Trennlinie:
  - Linkes Segment: Label „Speichern“ / „Speichern…“. Speichert und lässt das EP offen. Nach Anlegen (oder Schlüsselwechsel) Wechsel per `replace` auf die Edit-Route des gespeicherten Schlüssels. Tooltip nach 500ms: „Speichern und geöffnet lassen“.
  - Rechtes Segment: nur `IconX`, `aria-label="Speichern und schließen"`. Speichert und schließt das EP (`replace`, Back). Tooltip nach 500ms: „Speichern und schließen“.
- **Abbrechen** kehrt ins LP zurück (Back), ohne zu speichern.

Schmale Leiste: Die Leiste ist ein `@container`. Unter `36rem` werden die Buttons zum Sandwich-Menü (`IconMenu2`), in derselben Zeile und rechtsbündig. Das Menü klappt rechts aus; die Einträge sind volle Breite und linksbündig. Es schließt bei Außenklick, Escape und nach einer Aktion. Der Hinweistext bleibt in der Zeile, das Sandwich bleibt rechts.

### LP

- Tabelle über die volle Breite, horizontal scrollbar ab `min-w-[640px]`. Keine Karten, keine Checkbox-Spalte, keine Aktions-Spalte, keine Edit- oder Löschen-Icons in der Zeile.
- Spaltenüberschriften: Uppercase, `text-xs`, gedämpft. Jede Spalte ist sortierbar. Klick auf die aktive Spalte kehrt die Richtung um; eine neue Spalte startet aufsteigend. Sortierung mit Locale `de`. Aktiv: Chevron und dunklere Schrift. Inaktiv: gedimmtes Selector-Icon. `aria-sort` ist gesetzt.
- Darunter eine permanente Filterzeile, eine Suche pro Spalte, Platzhalter „Filtern…“. Treffer ist ein Contains, ohne Beachtung der Großschreibung (`de`). Die Spaltenfilter sind UND-verknüpft und gelten zusätzlich zur globalen Suche.
- Auswahl ohne Checkbox:
  - Klick wählt genau diese Zeile. Ein erneuter Klick auf die einzige Auswahl hebt sie auf.
  - Strg oder Cmd schaltet eine Zeile dazu oder weg.
  - Umschalt wählt den Bereich ab dem Anker.
  - Was Filter oder Suche ausblendet, fällt aus der Auswahl.
  - Gewählt: `bg-surface-container`. Sonst Hover `bg-surface-container-low`.
- Doppelklick öffnet das EP dieser Zeile (Forward). Auf Mobile ist Doppel-Tap dieselbe Aktion ([Mobile](#mobile)).
- Leere Anzeige ist ein Geviertstrich „—“.
- Zustände in der Tabelle: „Laden…“, „Noch keine {Entität} vorhanden.“, „Keine Treffer für die aktuelle Suche.“, „Keine Treffer für die aktuellen Filter.“

### EP

- Volle Breite des Content-Bereichs, keine schmale Formularspalte. Abstand zur Optionsleiste `mt-8`, seitlich `px-3`.
- Der Inhalt ist in logische Gruppen geteilt. Gruppentitel: Icon in Primary, Uppercase, `text-sm font-semibold tracking-wide`, Unterkante. Abstand zwischen Gruppen `gap-8`.
- Jede Gruppe ist aufklappbar. Klick auf die Titelzeile (volle Breite, Button) schaltet den Inhalt. Chevron rechts, gedämpft, 18px: `IconChevronDown` offen, `IconChevronRight` zu (`aria-expanded` / `aria-controls`). Default **offen**. Ausnahme: die Gruppen **Dokumente** und **Sonstiges** starten **zu**. Zustand lebt in der Sektion und setzt sich beim erneuten Öffnen des EP zurück. Höhe animiert 160ms `ease-out`; `prefers-reduced-motion` ohne Transition. Zugeklappt: Inhalt nicht im Tab-Fokus (`inert`). Enthält eine zugeklappte Gruppe einen Treffer der globalen Suche, öffnet sie sich; manuelles Zuklappen während derselben Suche bleibt, bis die Suche sich ändert.
- Feldraster: eine Spalte, ab `md` zwei, ab `xl` drei. Abstand `gap-5`.
- Textfelder nutzen Floating Labels. Leer und unfokussiert steht das Label im Feld. Bei Fokus oder Wert gleitet es an den oberen Rand (160ms, auf 75% skaliert). `prefers-reduced-motion` ohne diese Transition.
- Pflicht kommt aus dem Datenbankschema, nicht aus einer festen Frontend-Liste. Ein Pflichtfeld trägt einen roten Stern und den Rahmen `border-error/60`; der Fokusring ist ebenfalls `error`.
- Ein Hinweis sitzt unter dem Feld (`text-xs`), nicht im Label.
- Nur-Lesen-Werte (z. B. GUID) sind Text auf `surface-container-low`, kein Eingabefeld.
- Mehrfachzuordnungen sind eine Checkbox-Liste, Anzeige `{key} — {name}`.
- Jeder Datensatz hat im EP am Ende eine Gruppe **Sonstiges** (Standard-Icon `IconDots`, Default **zu**). Stand jetzt zwei Felder:
  - **Mandant:** der `key` der Site (`fk_site`), nur lesbar, als Token in `colorCode` der Site — dasselbe Token-Muster wie die Nebenmandanten in der Benutzer-LP (`tokenTone`). Kein Eingabefeld, nicht wählbar, keine LP-Spalte. Im Anlegen ist das der Hauptmandant der Session. Ausnahme App **Mandanten** (`sites` ohne `fk_site`): kein Mandant-Feld; Icon und Inhalt siehe Referenz Mandanten.
  - **GUID:** `uid`, Label „GUID“, nur lesbar, mit Copy-Button im Feld (`IconCopy`; kurz `IconCheck` nach Erfolg). Im Anlegen „—“ und Button deaktiviert, im Bearbeiten der Wert. Navigation, LP und Referenzen bleiben beim `key`. Ausnahme App **Benutzer:** die Gruppe **Mandanten** bleibt für Nebenmandanten (Checkboxen); der Hauptmandant steht in **Sonstiges** als farbiger Schlüssel-Token (Label „Mandant“).

### Animation

Wechsel nur zwischen LP und EP, über die View Transitions API. Der Name `panel` liegt auf dem App-Inhalt, nicht auf Sidebar oder Navbar.

- Gleichzeitig Slide, Fade und Blur. Dauer 160ms, `ease-out`. Weg `3.5rem`, Blur `12px`, Opacity auf 0.
- Forward (LP → EP, auch Neu, Bearbeiten, Doppelklick): Liste nach links hinaus, Editor von rechts herein.
- Back (Speichern und schließen, Abbrechen, Zurück nur bei EP → LP derselben App): gespiegelt.
- App-Wechsel (Sidebar, Querverweis, Zurück über App-Grenze) ohne Panel-Animation.
- `prefers-reduced-motion`: Dauer 0.

### Globale Suche

Dieselbe Leiste in jeder App, links in der Navbar.

- LP: filtert die Datensätze. Ein Treffer ist ein Datensatz, bei dem irgendein sichtbares Feld die Eingabe enthält. Spaltenfilter gelten zusätzlich. Platzhalter „Daten suchen…“.
- EP: hebt Felder hervor, deren Bezeichnung oder sichtbarer Wert die Eingabe enthält (Primary-Fläche und Ring). Übrige Felder sinken auf Opacity 40. Der erste Treffer rückt ins Blickfeld. Platzhalter „Felder suchen…“.
- Ohne registrierte App ist die Suche inaktiv. Platzhalter „Suche in einer App…“.
- Escape oder das Löschen-Icon leert die Eingabe. Der Wechsel der Ansicht leert sie ebenfalls.
- Vergleich ohne Großschreibung, Locale `de`.

### Referenz: Benutzer

Nur diese App. Das Muster oben gilt für alle; die Felder nicht.

- LP-Spalten: Schlüssel, Login, Name, Nebenmandanten, Mitarbeiter. Standardsortierung Schlüssel aufsteigend. Name ist „Vorname Nachname“ und sortiert nach Nachname, dann Vorname. Nebenmandanten sind farbige Schlüssel-Tokens (`tokenTone`), sonst „—“. Mitarbeiter ist der `key` der 1:1-Zuordnung, sonst „—“.
- EP-Gruppen: **Basis Informationen** (`IconId`), **Mandanten** (`IconBuilding`: Nebenmandanten als Checkboxen), **Referenzen** (`IconLink`), **Sonstiges** (`IconDots`: Mandant als farbiger Schlüssel-Token, GUID).
- Schema-Pflicht: Schlüssel, Login, E-Mail. Passwort nur beim Anlegen; im Bearbeiten leer lassen heißt beibehalten, mit Umschalter für die Sichtbarkeit. Vorname und Nachname sind optional.
- Hauptmandant ist der des Aufrufers und nicht wählbar; er steht in **Sonstiges** (Label „Mandant“). Nebenmandanten sind die übrigen Sites als Checkboxen in **Mandanten**.
- Referenzen: optional genau ein Mitarbeiter des eigenen Hauptmandanten (`employeeKey`). Anzeige `{key} — {Vorname Nachname}`; leere Option „—“ löst die Zuordnung. Bereits einem anderen Benutzer zugeordnete Mitarbeiter sind deaktiviert; der aktuell gewählte bleibt wählbar. 1:1 (`UNIQUE` auf `users.fk_employee`).
- Der eigene Account darf nicht gelöscht werden. Speichert man den eigenen Account, wird die angezeigte Session mitgezogen.
- Sichtbar ist nur der eigene Hauptmandant. Navigation und Anzeige laufen über `key`; `uid` nur in **Sonstiges**.

### Referenz: Mandanten

Nur diese App. Das Muster oben gilt für alle; die Felder nicht.

- LP-Spalten: Schlüssel, Name, Farbcode. Standardsortierung Schlüssel aufsteigend. Farbcode zeigt Swatch und Hex-Text.
- EP-Gruppen: **Basis Informationen** (`IconBuilding`: Schlüssel, Name), **Sonstiges** (`IconPalette`: Farbcode, GUID). Kein Mandant-Feld (`sites` ohne `fk_site`). Schema-Pflicht: Schlüssel, Name und Farbcode (`#RRGGBB`). Color-Picker und Hex-Feld sind synchron; Default beim Anlegen `#2563EB`.
- Sichtbar und pflegbar sind alle Sites (`sites` ohne `fk_site`). Keine Rollenprüfung.
- `colorCode` steckt auch in `SiteRef` (Login, Session, Benutzer-Antworten) und steuert das Token in **Sonstiges** sowie die Nebenmandanten-Tokens in der Benutzer-LP.
- Löschen ist verboten, solange die Site als `users.fk_site`, `user_secondary_sites.fk_site`, `user_secondary_sites.fk_secondary_site`, `cost_centers.fk_site`, `employees.fk_site`, `assets.fk_site` oder `settings.fk_site` referenziert wird (`409`).
- Ändern eines referenzierten Mandanten bleibt erlaubt (FKs zeigen auf `uid`). Bei Schlüsseländerung werden USS-Zuordnungsschlüssel mitgezogen, bei denen diese Site der Nebenmandant ist.
- Speichert man den Haupt- oder einen Nebenmandanten der laufenden Session, wird die angezeigte Session mitgezogen.

### Referenz: Kostenstellen

Nur diese App. Das Muster oben gilt für alle; die Felder nicht.

- LP-Spalten: Schlüssel, Name. Standardsortierung Schlüssel aufsteigend.
- EP-Gruppen: **Basis Informationen** (`IconCash`: Schlüssel, Name), **Sonstiges** (`IconDots`: Mandant-Token, GUID). Schema-Pflicht: Schlüssel und Name. Mandant nicht wählbar und keine LP-Spalte.
- Sichtbar und pflegbar sind nur Kostenstellen mit `cost_centers.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`). Neue Datensätze erhalten immer dieses `fk_site`.
- Navigation und Anzeige laufen über `key`; `uid` nur in **Sonstiges**.
- Löschen ist verboten, solange `assets.fk_cost_center` darauf zeigt (`409`). Mandanten-Löschen bleibt verboten, solange `cost_centers.fk_site` darauf zeigt (`409`).

### Referenz: Assets

Nur diese App. Das Muster oben gilt für alle; die Felder nicht.

- LP-Spalten: Bild, Schlüssel, Typ, Typ, Kostenstelle, Seriennummer, Hersteller, Dokumente. Standardsortierung Schlüssel aufsteigend. Bild ist ein 40×40-Vorschaubild oder „—“. Die erste Spalte Typ ist die Art (Pastell-Chip mit Icon und deutschem Label). Die zweite Spalte Typ ist das Eltern-Asset, leer als „—“, ebenso Seriennummer und Hersteller. Dokumente: `IconPaperclip` und Anzahl, bei 0 „—“ (Zählung über `GET /api/documents/counts`).
- EP-Gruppen: **Basis Informationen** (`IconBox`: links Thumbnail mit Vorschau/Bild wählen/Entfernen, rechts Schlüssel, Typ, Seriennummer, Hersteller), **Referenzen** (`IconLink`: Typ, Kostenstelle), **Dokumente** (`IconPaperclip`: Liste + Drop-Zone, nur Bearbeiten), **Sonstiges** (`IconDots`: Mandant-Token, GUID).
- Schema-Pflicht: Schlüssel, Typ (Art), Kostenstelle. Das Eltern-Asset (Label Typ) ist Pflicht außer bei der Art Standort. Seriennummer, Hersteller und Thumbnail sind optional. Mandant nicht wählbar und keine LP-Spalte.
- Thumbnail: optionaler Datei-Upload auf dem API-Server (`apps/api/uploads/assets/`, gitignoriert). Erlaubt JPEG/PNG/WebP, max. 2 MB. DB-Spalte `thumbnail_path` speichert nur den Dateinamen; API liefert `thumbnailUrl`. Upload/Löschen über eigene Endpunkte; beim Anlegen wird die Datei nach dem Create hochgeladen. Beim Löschen des Assets werden Thumbnail und Dokumentenverzeichnis mit entfernt.
- Dokumente: App ist dokumententauglich. Im Bearbeiten-EP Gruppe **Dokumente** mit Dateiliste (Name, Art, Größe; Klick öffnet) und Drag-and-Drop-Upload auf die ganze Sektion (mehrere Dateien). Die Gruppe startet zugeklappt (wie **Sonstiges**). Leerhinweis „Keine Dokumente — Dateien hierher ziehen.“ Neutrale Ribbon-Aktion **Dokumente** (Badge ab Anzahl 1) öffnet `/documents/assets/:key` (Forward). Beim Anlegen entfallen Gruppe und Aktion. Dateitypen mit farbigem Icon; Bilder als 32×32-Vorschau und in Lightbox ohne Download, andere Dateien weiterhin Download.
- Art und Eltern-Asset (beide Label Typ) sind Comboboxen (selItem). Art-Optionen zeigen Farbe und Icon; Eltern-Optionen mit Farbe/Icon der Eltern-Art. Standort: Eltern-Asset optional (Wurzel oder unter anderem Standort/gleicher Stufe). Alle anderen Arten: Eltern-Asset Pflicht.
- Typ-Codes (DB englisch, UI deutsch) mit fester Pastellfarbe und Icon: `location` Standort `#BFDBFE` `IconMapPin`, `building` Gebäude `#A5F3FC` `IconBuilding`, `area` Fläche `#BBF7D0` `IconBorderCorners`, `assembly` Baugruppe `#FED7AA` `IconComponents`, `maintenance_object` Instandhaltungsobjekt `#FBCFE8` `IconTool`. Farbe/Icon nur UI, nicht in der DB.
- Hierarchie (Rang von oben nach unten): Standort → Gebäude → Fläche → Baugruppe → Instandhaltungsobjekt. Ein Eltern-Asset darf nur Kinder gleicher oder tieferer Stufe beherbergen (nicht höher). Beispiel: Instandhaltungsobjekt direkt unter Standort ist erlaubt; Standort unter Baugruppe nicht. Standort darf unter Standort liegen. Eltern-Asset (Label Typ) und Kostenstelle müssen zum eigenen Hauptmandanten gehören. Zyklen über das Eltern-Asset sind verboten.
- Typwechsel nur, solange keine Kinder existieren (`409`).
- Sichtbar und pflegbar sind nur Assets mit `assets.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`). Neue Datensätze erhalten immer dieses `fk_site`.
- Navigation und Anzeige laufen über `key`; `uid` nur in **Sonstiges**.
- Löschen ist verboten, solange Kinder (`fk_parent`) darauf zeigen (`409`). Mandanten-Löschen bleibt verboten, solange `assets.fk_site` darauf zeigt (`409`). Kostenstellen-Löschen bleibt verboten, solange `assets.fk_cost_center` darauf zeigt (`409`).

### Referenz: Baumstruktur

Nur diese App. Abweichung vom Standard-LP.

- Zeigt dieselben Assets des Hauptmandanten als Tree Table über `parentKey` (`assets.fk_parent`). Kein eigener Endpunkt; Daten kommen von `GET /api/assets`.
- LP-Spalten: Bild, Schlüssel, Typ, Kostenstelle, Seriennummer, Hersteller, Dokumente. Keine Eltern-Spalte — die Einrückung zeigt die Verknüpfung. Standardsortierung Schlüssel aufsteigend, gilt nur unter Geschwistern. Dokumente wie in Assets (Icon plus Anzahl).
- Schlüssel-Zelle: Aufklapp-Chevron eingerückt nach Tiefe; Blätter mit gleichem Abstand ohne Button. Start: alle Knoten mit Kindern aufgeklappt. Aktionen **Aufklappen** und **Zuklappen** für den gesamten Baum. Count = sichtbare Zeilen.
- Kein Neu, kein Löschen. **Bearbeiten** und Doppelklick öffnen das Asset-EP (`/assets/:key/edit`) mit Rückkehr nach `/asset-tree`.
- Spaltenfilter und globale Suche wie im Standard-LP. Ein Treffer in einem Kind behält die Vorfahren und klappt den Pfad auf, ohne den manuellen Aufklappzustand zu überschreiben.

### Referenz: Dokumente

Nur diese App. Abweichung vom Standard-LP/EP.

- Ablage ohne DB-Tabelle: Dateien unter `apps/api/doc/{siteUid}/assets/{assetUid}/` (gitignoriert). Root über `documentStorageDir()` (aktuell `apps/api/doc`); später parametrisierbar. Metadaten aus dem Dateisystem; Bezug über Asset-`key`.
- Dokumententauglich aktuell nur **Assets** (`DOCUMENT_APPS = ["assets"]`). Andere Apps ohne Upload und ohne Hinweis.
- Jeder Dateityp, max. 25 MB. Download nur mit JWT (`Content-Disposition: attachment`, `nosniff`).
- LP-Spalten: Name (mit farbigem Typ-Icon bzw. Bildvorschau), Art (Endung), Größe, Datum, Bezug (Asset-Schlüssel). Standardsortierung Name aufsteigend. Doppelklick: Bilder in Lightbox, sonst Download. Löschen mit Bestätigung.
- Kein EP, kein Neu. Globale Liste `/documents` ohne Hochladen. Mit Datensatz `/documents/assets/:key`: Aktionen **Hochladen** (mehrere Dateien), **Löschen**, **Schließen** (zurück ins Asset-EP, Back).

### Referenz: Mitarbeiter

Nur diese App. Das Muster oben gilt für alle; die Felder nicht.

- LP-Spalten: Schlüssel, Name. Standardsortierung Schlüssel aufsteigend. Name ist „Vorname Nachname“ und sortiert nach Nachname, dann Vorname.
- EP-Gruppen: **Basis Informationen** (`IconIdBadge2`: Schlüssel, Vorname, Nachname), **Sonstiges** (`IconDots`: Mandant-Token, GUID). Schema-Pflicht: Schlüssel, Vorname und Nachname. Mandant nicht wählbar und keine LP-Spalte.
- Sichtbar und pflegbar sind nur Mitarbeiter mit `employees.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`). Neue Datensätze erhalten immer dieses `fk_site`.
- Navigation und Anzeige laufen über `key`; `uid` nur in **Sonstiges**.
- Löschen ist verboten, solange `users.fk_employee` darauf zeigt (`409`). Mandanten-Löschen bleibt verboten, solange `employees.fk_site` darauf zeigt (`409`).

### Referenz: Einstellungen

Nur diese App. Abweichung vom Standard-LP/EP.

- Parameter kommen aus einem API-Katalog (`setting-catalog.ts`), nicht aus CRUD. Gespeichert wird nur der Wert in `settings`.
- LP-Titel „Einstellungen“. Optionsleiste: statt Neu / Bearbeiten / Löschen die Reiter **Allgemein**, **Listen**, **Aufträge** (sichtbar, kein Sandwich). Aktiv über `?category=general|lists|orders`, Default `general`. Reiterwechsel ohne Panel-Animation.
- LP-Spalten: Schlüssel, Name, Beschreibung, Wert. Standardsortierung Schlüssel aufsteigend. Keine Zeilenauswahl. Doppelklick öffnet das EP. Leere Kategorie: „Noch keine Einstellungen vorhanden.“
- EP nur Bearbeiten (`/settings/:key/edit`), kein Anlegen. Titel „Einstellung bearbeiten“. Aktionen **Speichern** (bleibt offen), **Speichern und schließen** und **Abbrechen**; Rückkehr in denselben Reiter.
- EP-Gruppen: **Parameter** (`IconAdjustments`: Schlüssel, Name, Beschreibung nur lesbar; Wert editierbar), **Erläuterung** (`IconInfoCircle`: Langtext), **Sonstiges** (`IconDots`: Mandant-Token, GUID). Vor dem ersten Speichern ist die GUID „—“.
- Geltung je Parameter: `global` (mandantenübergreifend, `fk_site` NULL) oder `site` (Hauptmandant aus JWT). Aktuell nur **DWH** (Allgemein, site, Zahl, Default 8, endlich und größer als 0).
- Ohne gespeicherte Zeile gilt der Katalog-Default. Kein POST, kein DELETE.

## Mobile

Dieselbe Fachlogik wie Web. Apps, LP, EP und Aktionen folgen den [App Guidelines](#app-guidelines). Eine Abweichung steht ausdrücklich in diesem Abschnitt.

- **Doppel-Tap** auf eine Zeile ist identisch mit **Doppelklick** auf Web: das EP dieser Zeile öffnet sich (Forward).

## Repository-Struktur

```
pulse/
  apps/
    api/      NestJS API (+ db/migrations)
    web/      Vite React Web (Login, Benutzer, Mandanten, Kostenstellen, Assets, Baumstruktur, Dokumente, Mitarbeiter, Einstellungen)
    mobile/   Expo React Native
  DESIGN_pulse.md
  guidelines.md
  package.json
  pnpm-workspace.yaml
```

## Datenbank

- **Instanz:** self-hosted Postgres auf dem NAS `192.168.178.106`, Port `41631` (gemeinsam mit anderen Projekten, jeweils eigene DB).
- **Entwicklungsdatenbank:** `pulse_dev`
- **Anlage:** `CREATE DATABASE pulse_dev` mit Server-Defaults, nur wenn die DB noch nicht existiert. Kein `DROP`.
- **Encoding:** nach Anlage prüfen; muss `UTF8` sein. Abweichung → Abbruch und Rückfrage, kein stilles Umbauen.
- **Inhalt (aktuell):** Extension `pgcrypto`; Tabellen `sites`, `users`, `user_secondary_sites`, `cost_centers`, `employees`, `assets` (inkl. optionalem `thumbnail_path`), `settings`; Tracking `schema_migrations`. Keine Dokumenten-Tabelle. Datei-Uploads unter `apps/api/uploads/` (Thumbnails) und `apps/api/doc/` (Dokumente), beide nicht im Git.
- **App-Zugriff:** `DATABASE_URL` zeigt auf `/pulse_dev`. Wartung/Anlage über `POSTGRES_ADMIN_URL` auf die Datenbank `postgres`.
- **ORM:** keines. SQL-Migrationen unter `apps/api/db/migrations/`, Zugriff über `pg`.
- **Migrationen:** `pnpm --filter @pulse/api db:migrate` · Seed: `pnpm --filter @pulse/api db:seed`

## Datenkonsistenz

- Tabellen- und Spaltennamen sind **englisch**.
- Jeder Datensatz hat:
  - `uid` – UUID, Primärschlüssel; im EP nur lesbar in der Gruppe **Sonstiges** (Label „GUID“), nicht in der LP und nicht als Referenz
  - `key` – user-sichtbare Pflichtangabe (Anzeige und Referenz in der UI; Navigation läuft über `key`)
  - `fk_site` – Zuordnung zum Mandanten (**Site**), außer auf der Wurzel-Tabelle `sites` und bei mandantenübergreifenden `settings` (`fk_site` NULL)
- Wird referenziert, zeigt die UI den `key` des Zieldatensatzes, nicht die `uid`. Intern speichert die DB weiterhin die `uid`.
- **Site / Mandant**
  - `sites` ist die Mandanten-Wurzel (ohne `fk_site`).
  - Mandanten steuern Lese- und Schreibzugriff: sichtbar und pflegbar sind Datensätze mit `fk_site` auf einen Mandanten, zu dem der Benutzer Zugang hat.
  - **Hauptmandant:** jeder User hat genau eine Site über `users.fk_site` (1:1). Im Normalfall Zugang nur zu diesem Mandanten.
  - **Nebenmandant:** zusätzliche Sites über `user_secondary_sites` (1:n), gepflegt im Feld Nebenmandanten. Erweitert den Zugang um genau diese Sites; sie sind nicht der Default für neue Records.
  - Neue Datensätze erhalten das `fk_site` des Hauptmandanten des anlegenden Benutzers. Ausnahme **Aufträge** (noch nicht umgesetzt): der Auftrag übernimmt den Mandanten des zugehörigen Assets.
  - Ausnahme App **Mandanten:** alle Sites sind sichtbar und pflegbar (siehe Site-CRUD).
- Abgesprochenes Schema (Kurzform):
  - `sites(uid, key, name, color_code, created_at, updated_at)` mit Check `color_code ~ '^#[0-9A-Fa-f]{6}$'`
  - `users(uid, key, fk_site, fk_employee, login_name, first_name, last_name, password_hash, …)` mit `UNIQUE(fk_site, key)`, `UNIQUE(fk_site, login_name)` und partieller Unique auf `fk_employee`
  - `user_secondary_sites(uid, key, fk_site, fk_user, fk_secondary_site, …)` mit `UNIQUE(fk_user, fk_secondary_site)`
  - `cost_centers(uid, key, fk_site, name, created_at, updated_at)` mit `UNIQUE(fk_site, key)`
  - `employees(uid, key, fk_site, first_name, last_name, created_at, updated_at)` mit `UNIQUE(fk_site, key)`
  - `assets(uid, key, fk_site, type, fk_parent, fk_cost_center, serial_number, manufacturer, thumbnail_path, created_at, updated_at)` mit `UNIQUE(fk_site, key)`, Check auf `type`, Check `type = location OR fk_parent IS NOT NULL` (Standort darf Wurzel sein; Rangregel Eltern/Kind in der API)
  - `settings(uid, key, fk_site, value jsonb, created_at, updated_at)` mit partiellen Uniques `(key)` wo `fk_site IS NULL` und `(fk_site, key)` wo `fk_site IS NOT NULL`; Katalog-Metadaten nur im Code
- **User-CRUD (abgesprochen):**
  - Sichtbar und pflegbar sind nur Benutzer mit `users.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`).
  - Hauptmandant neuer/geänderter Benutzer ist immer der des Aufrufers (nicht wählbar).
  - Nebenmandanten über `user_secondary_sites`; Zuordnungs-`key` wird automatisch als `USS-{userKey}-{siteKey}` gesetzt und bei Schlüsseländerung mitgezogen.
  - Optional genau ein Mitarbeiter über `users.fk_employee` (`employeeKey` in Create/Update; `null` löst die Zuordnung). Mitarbeiter muss zum eigenen Hauptmandanten gehören; bereits vergebene Zuordnung → `409`.
  - `login_name` ist app-seitig global eindeutig (Login bricht bei Mehrfachtreffern ab); DB-Constraint bleibt `UNIQUE(fk_site, login_name)`.
  - Eigenen Account darf man nicht löschen.
- **Site-CRUD (abgesprochen):**
  - Sichtbar und pflegbar sind alle Mandanten (`sites`).
  - Felder: `key`, `name`, `color_code` (alle Pflicht; `key` global eindeutig; `color_code` Hex `#RRGGBB`, speichern als Uppercase).
  - `SiteRef` in Auth/User-Antworten enthält `colorCode`.
  - Löschen nur, wenn keine Referenz in `users.fk_site`, `user_secondary_sites.fk_site`, `user_secondary_sites.fk_secondary_site`, `cost_centers.fk_site`, `employees.fk_site`, `assets.fk_site` oder `settings.fk_site` existiert; sonst `409`.
  - Bei Schlüsseländerung: USS-`key` der Zuordnungen mit `fk_secondary_site` = dieser Site werden auf `USS-{userKey}-{siteKey}` aktualisiert.
- **Kostenstellen-CRUD (abgesprochen):**
  - Sichtbar und pflegbar sind nur Kostenstellen mit `cost_centers.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`).
  - Felder: `key`, `name` (beide Pflicht; `key` eindeutig je Mandant).
  - Neue Datensätze erhalten immer `fk_site` des Aufrufers (nicht wählbar).
  - Löschen nur, wenn kein `assets.fk_cost_center` darauf zeigt; sonst `409`.
- **Mitarbeiter-CRUD (abgesprochen):**
  - Sichtbar und pflegbar sind nur Mitarbeiter mit `employees.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`).
  - Felder: `key`, `first_name`, `last_name` (alle Pflicht; `key` eindeutig je Mandant).
  - Neue Datensätze erhalten immer `fk_site` des Aufrufers (nicht wählbar).
  - Löschen nur, wenn kein `users.fk_employee` darauf zeigt; sonst `409`.
- **Asset-CRUD (abgesprochen):**
  - Sichtbar und pflegbar sind nur Assets mit `assets.fk_site` = Hauptmandant des Aufrufers (JWT `siteUid`).
  - Felder: `key`, `type` (Pflicht), `parentKey` (Pflicht außer Standort → `null`), `costCenterKey` (Pflicht), `serialNumber`, `manufacturer` (optional; leer → `NULL`), `thumbnailUrl` (nur Antwort; optional).
  - `type`: `location` | `building` | `area` | `assembly` | `maintenance_object`.
  - Hierarchie: Eltern darf nur gleiche oder tiefere Stufe hosten (Standort…Instandhaltungsobjekt). Eltern-Asset (Label Typ) bei Standort optional; bei allen anderen Arten Pflicht. Keine Zyklen über das Eltern-Asset.
  - Typwechsel nur ohne Kinder; Löschen nur ohne Kinder; sonst `409`.
  - Thumbnail-Datei unter `uploads/assets/{uid}.{ext}`; `thumbnail_path` in der DB; öffentliche Auslieferung `GET /api/uploads/assets/:filename`.
  - Dokumente unter `doc/{siteUid}/assets/{assetUid}/` (ohne DB); beim Asset-Löschen wird das Verzeichnis entfernt.
  - Neue Datensätze erhalten immer `fk_site` des Aufrufers (nicht wählbar).
- **Dokumente (abgesprochen):**
  - Keine Tabelle; Dateien unter `apps/api/doc/`. Root: `documentStorageDir()`.
  - Nur App `assets` dokumententauglich.
  - Sichtbar und pflegbar nur Dokumente zu Assets des eigenen Hauptmandanten.
  - Upload multipart Feld `file` (auch mehrere), max. 25 MB, beliebiger Typ; Dateiname bereinigt, Kollisionen als `name (2).ext`.
- **Einstellungen (abgesprochen):**
  - Katalog im API-Code; DB speichert nur Werte in `settings`.
  - Geltung `global` (`fk_site` NULL) oder `site` (Hauptmandant JWT).
  - Erster Parameter: `DWH` (Allgemein, site, Zahl, Default 8, endlich und `> 0`).
  - API: `GET /api/settings`, `GET/PATCH /api/settings/:key` — kein POST, kein DELETE. Upsert beim Speichern; ohne Zeile gilt der Default.
  - Mandanten-Löschen verboten, solange `settings.fk_site` darauf zeigt (`409`).

## Ports

| Dienst | Port |
| --- | --- |
| API | `3010` |
| Web (Vite) | `5173` |
| Mobile (Expo Metro) | `8081` |

Belegt durch andere Projekte: Vereinsmanager API `3001`, Redex API `3002`.

## Secrets und Umgebung

- Root-`.env` und `apps/api/.env` sind gitignoriert.
- `.env.example` enthält Platzhalter ohne echte Passwörter.
- Mobile: `EXPO_PUBLIC_API_URL` zeigt im LAN auf die IP dieses Entwicklungs-PCs und Port `3010`.
- Web: Vite-Dev-Proxy leitet `/api` nach `http://127.0.0.1:3010` weiter.

## API (aktuell)

- Globaler Prefix: `/api`
- `GET /api/health` → DB-Check (`up` / `down`)
- `POST /api/auth/login` → `{ loginName, password, rememberMe? }` → JWT + User (ohne `uid` im sichtbaren User-Objekt; Sites als `key`/`name`/`colorCode`)
- `GET /api/auth/me` → aktueller User (Bearer JWT; ohne `uid`)
- Passwort-Hashes: argon2. JWT-TTL: 8h, bei Remember-Me 30d. Secret: `JWT_SECRET` in `.env`.
- User-CRUD (Bearer JWT, Antworten mit `uid`, ohne Passwort-Hash):
  - `GET /api/users` — Liste des eigenen Hauptmandanten
  - `GET /api/users/site-options` — wählbare Nebenmandanten
  - `GET /api/users/employee-options` — wählbare Mitarbeiter (inkl. `assignedUserKey`)
  - `POST /api/users` — anlegen (`key`, `loginName`, `firstName`, `lastName`, `password`, `secondarySiteKeys`, `employeeKey`)
  - `GET /api/users/:key` — ein Benutzer
  - `PATCH /api/users/:key` — bearbeiten (`password` optional; leer/fehlend = unverändert; `employeeKey` null = Zuordnung lösen)
  - `DELETE /api/users/:key` — löschen (eigener Account verboten)
- Site-CRUD (Bearer JWT, Antworten mit `uid`):
  - `GET /api/sites` — alle Mandanten
  - `POST /api/sites` — anlegen (`key`, `name`, `colorCode`)
  - `GET /api/sites/:key` — ein Mandant
  - `PATCH /api/sites/:key` — bearbeiten
  - `DELETE /api/sites/:key` — löschen (bei Referenz `409`)
- Kostenstellen-CRUD (Bearer JWT, Antworten mit `uid`):
  - `GET /api/cost-centers` — Liste des eigenen Hauptmandanten
  - `POST /api/cost-centers` — anlegen (`key`, `name`)
  - `GET /api/cost-centers/:key` — eine Kostenstelle
  - `PATCH /api/cost-centers/:key` — bearbeiten
  - `DELETE /api/cost-centers/:key` — löschen (bei Referenz `409`)
- Mitarbeiter-CRUD (Bearer JWT, Antworten mit `uid`):
  - `GET /api/employees` — Liste des eigenen Hauptmandanten
  - `POST /api/employees` — anlegen (`key`, `firstName`, `lastName`)
  - `GET /api/employees/:key` — ein Mitarbeiter
  - `PATCH /api/employees/:key` — bearbeiten
  - `DELETE /api/employees/:key` — löschen (bei Referenz `409`)
- Asset-CRUD (Bearer JWT, Antworten mit `uid`):
  - `GET /api/assets` — Liste des eigenen Hauptmandanten
  - `POST /api/assets` — anlegen (`key`, `type`, `parentKey`, `costCenterKey`, `serialNumber`, `manufacturer`)
  - `GET /api/assets/:key` — ein Asset
  - `PATCH /api/assets/:key` — bearbeiten
  - `POST /api/assets/:key/thumbnail` — Thumbnail hochladen (multipart Feld `file`)
  - `DELETE /api/assets/:key/thumbnail` — Thumbnail entfernen
  - `DELETE /api/assets/:key` — löschen (bei Kindern `409`)
- Uploads (öffentlich lesbar):
  - `GET /api/uploads/assets/:filename` — Asset-Thumbnail-Datei
- Dokumente (Bearer JWT):
  - `GET /api/documents?app=assets` — alle Dokumente des Mandanten
  - `GET /api/documents?app=assets&recordKey=` — Dokumente eines Assets
  - `GET /api/documents/counts?app=assets` — `{ [assetKey]: anzahl }` nur Anzahl > 0
  - `POST /api/documents/assets/:key` — hochladen (multipart `file`, auch mehrere)
  - `GET /api/documents/assets/:key/:filename` — Download
  - `DELETE /api/documents/assets/:key/:filename` — löschen
- Einstellungen (Bearer JWT, Antworten mit `uid` oder `null` bei Default):
  - `GET /api/settings` — Katalog mit aufgelösten Werten (Mandant bzw. global)
  - `GET /api/settings/:key` — ein Parameter
  - `PATCH /api/settings/:key` — Wert speichern (`{ value }`; Upsert)

## Web (aktuell)

- Login, danach Start auf `/sites`. Sidebar nur mit den gebauten Apps: „Mandanten“ unter `/sites`, „Kostenstellen“ unter `/cost-centers`, „Assets“ unter `/assets`, „Baumstruktur“ unter `/asset-tree`, „Dokumente“ unter `/documents`, „Mitarbeiter“ unter `/employees`, „Benutzer“ unter `/users`, „Einstellungen“ unter `/settings`. Jeweils **LP** (Liste) und **EP** (Anlegen/Bearbeiten per Doppelklick); Baumstruktur und Dokumente sind nur LP; Einstellungen haben Reiter statt CRUD und nur ein Bearbeiten-EP. Dokumente mit Datensatz unter `/documents/assets/:key` (Hochladen). Globale Suche filtert die Liste und hebt im Editor passende Felder hervor.

## Nächste Schritte (nur nach Absprache)

- Mobile Login
- Passwort-vergessen
- Site-Umschalter
- Aufträge übernehmen den Mandanten des Assets
- CMMS-Domänenmodule
- Shared-Packages bei Bedarf
