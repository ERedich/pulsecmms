---
name: Summerbreeze
colors:
  surface: '#fdf8ff'
  surface-dim: '#ddd8e0'
  surface-bright: '#fdf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f2fa'
  surface-container: '#f1ecf4'
  surface-container-high: '#ebe6ee'
  surface-container-highest: '#e6e1e9'
  on-surface: '#1c1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#312f35'
  inverse-on-surface: '#f4eff7'
  outline: '#7a7582'
  outline-variant: '#cac4d2'
  surface-tint: '#ea580c'
  primary: '#ea580c'
  on-primary: '#ffffff'
  primary-container: '#c2410c'
  on-primary-container: '#ffffff'
  inverse-primary: '#ffb68a'
  secondary: '#446649'
  on-secondary: '#ffffff'
  secondary-container: '#c3eac5'
  on-secondary-container: '#486a4d'
  tertiary: '#755b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#91731d'
  on-tertiary-container: '#080500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffedd5'
  primary-fixed-dim: '#ffb68a'
  on-primary-fixed: '#431407'
  on-primary-fixed-variant: '#9a3412'
  secondary-fixed: '#c5ecc8'
  secondary-fixed-dim: '#aad0ad'
  on-secondary-fixed: '#00210b'
  on-secondary-fixed-variant: '#2d4e33'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf8ff'
  on-background: '#1c1b20'
  surface-variant: '#e6e1e9'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Design System

## Brand & Style
The design system adopts a **Corporate / Modern** aesthetic, prioritizing clarity, trust, and structural balance. It uses the clean and versatile **Inter** font family across all typography levels to maintain high legibility and a professional appearance.

## Colors
The color palette is built on a semantic derivation model in light mode:
- **Primary:** `#ea580c`
- **Secondary:** `#729676`
- **Tertiary:** `#c9a74d`
- **Neutral:** `#79767d`

## Typography
All typography (`headline_font`, `body_font`, `label_font`) uses **Inter** to ensure a cohesive and highly readable visual experience across all form factors.

## Layout & Spacing
Built on a structured fluid grid with standard 1rem gutters and 1.5rem margins, utilizing consistent spacing tokens for paddings and gaps.

### Layout-Struktur
- **Standard: keine Cards.** Inhalte nicht standardmäßig in Karten mit Rahmen, Schatten oder abgehobenen Flächen packen.
- Bevorzuge klare Struktur über Abschnitte, Abstände, Typografie und tonale Flächen bzw. dezente Outlines.
- Cards nur, wenn ausdrücklich vorgegeben oder nötig für eine konkrete Interaktion. Entfällt Border, Schatten, Hintergrund oder Radius ohne Verlust von Verständnis oder Bedienbarkeit, ist es keine Card.
- **Genehmigte Ausnahme:** der Web-Login-Screen nutzt eine Glass-Card (Hintergrundbild + zentrierte Login-Fläche), wie im freigegebenen HTML-Beispiel.

## Elevation & Depth
Relies on subtle tonal layering and low-contrast outlines for structure.

## Shapes
Soft roundedness (`1`), applying 0.25rem corner radii to establish a gentle, approachable UI without sacrificing professional precision.

## Components
Standardized UI elements including buttons, chips, lists, checkboxes, and input fields, designed in harmony with the color palette and Inter typography. Cards are an exception, not a default building block — see **Layout-Struktur**.
