# AGENTS.md — Guía para Agentes en Palette Lab

Guía operativa y técnica para agentes de Inteligencia Artificial que colaboren en el desarrollo, mantenimiento y optimización del proyecto **Palette Lab**.

---

## 1. Visión General del Proyecto

**Palette Lab** es una aplicación web para crear paletas de cinco colores a partir de un único color base, con contraste WCAG garantizado y export listo para producción.

* **Propósito:** Ofrecer un generador de paletas que combine armonías cromáticas, tonos, bloqueo de colores, deshacer/rehacer e interpretación en lenguaje natural, con persistencia dual: `localStorage` para el invitado y Supabase (PostgreSQL con RLS) para el usuario autenticado.
* **Modelo de negocio:** el invitado genera, bloquea y exporta; la cuenta solo es necesaria para guardar y sincronizar paletas.
* **Dominio en Producción:** [https://palettelab.mgdc.site](https://palettelab.mgdc.site)
* **Repositorio:** el directorio todavía no tiene repositorio Git inicializado. No asumas URLs de clonado ni un remoto configurado.

---

## 2. Antes de Tocar Código

* **Arquitectura hexagonal:** respetar la dirección de dependencias. `src/lib` es dominio puro (sin Vue, sin DOM, sin `fetch`), los efectos externos viven en `src/adapters` detrás de interfaces declaradas en `src/ports`, los casos de uso pequeños en `src/application` y las vistas consumen stores de Pinia. Una vista nunca llama `fetch` directo.
* **Documentación de arquitectura:** lee [`docs/diseno-y-arquitectura.md`](docs/diseno-y-arquitectura.md) antes de cambios estructurales.
* **Uso del MCP CodeGraph:** el proyecto tiene índice (`.codegraph/`). Antes de búsquedas masivas usa `codegraph_explore` con `projectPath: "/home/ivan/software-dev/palette-lab"`. Para refrescar: `codegraph sync /home/ivan/software-dev/palette-lab`.
* **Contrato del BFF:** el frontend llama `/api/interpret`. En desarrollo el proxy de Vite hace de BFF; en producción lo hace `functions/api/interpret.ts`. La API key de IA nunca debe llegar al navegador.
* **Reglas de dominio:** antes de refactorizar `src/lib`, revisa la sección 6.2. Varias garantías (unicidad de HEX, contraste AA, base anclado) están cubiertas por tests y se rompen fácil con un cambio "inocente".

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime & Gestor** | **Bun** | `bun.lock` como lockfile |
| **Lenguaje** | **TypeScript** | `~6.0.3` (estricto, `vue-tsc` en el build) |
| **Framework** | **Vue 3** | `vue ^3.5.44` con `<script setup lang="ts">` |
| **Rutas** | **Vue Router 5** | `vue-router ^5.4.0` |
| **Estado Global** | **Pinia 4** | `pinia ^4.1.0` (`stores/palette.ts`, `auth.ts`, `saved-palettes.ts`) |
| **Build** | **Vite 8** | `vite ^8.3.4`, `@vitejs/plugin-vue ^6.0.10` |
| **Estilos** | **Sass** | `sass-embedded ^1.106.1` (sin Tailwind en la app; solo en el export) |
| **Backend / BFF** | **Cloudflare Pages Functions** | `functions/api/interpret.ts` |
| **Base de Datos & Auth** | **Supabase** | `@supabase/supabase-js ^2.118.0`, CLI `^2.122.0`, RLS por `auth.uid()` |
| **Anti-Bot** | **Cloudflare Turnstile** | Script externo, render explícito con `reset()` |
| **Interpretación con IA** | **FastAPI** (`palette-lab-api`) | Microservicio hermano, mockeable con `MOCK_AI=true` |
| **Iconografía** | **Lucide** | `@lucide/vue ^1.61.0` |
| **Linter & Formatter** | **Biome 2** | `2.5.12` (`biome.json`) |
| **Pruebas Unitarias** | **Vitest 5** | `vitest ^5.0.5`, `happy-dom ^21.0.4`, `@vue/test-utils ^2.5.1` |
| **Cobertura** | **V8** | `@vitest/coverage-v8`, umbrales 95/90/95/95 |
| **Infraestructura & Edge** | **Cloudflare Pages** | `wrangler ^4.152.0` |
| **CI/CD** | **GitHub Actions** | `.github/workflows/ci-cd.yml` |

**Estado de pruebas actual:** 27 archivos, 266 tests. Cobertura sobre `src/lib` y `src/composables`: 95.34% statements, 92.51% branches, 98.15% functions, 95.27% lines.

---

## 4. Estructura del Código

```
palette-lab/
├── functions/                     → BFF de producción (Cloudflare Pages Functions)
│   └── api/
│       ├── interpret.ts           → POST /api/interpret: valida, llama al microservicio y normaliza la receta
│       └── interpret.spec.ts      → 7 tests con fetch mockeado
│
├── src/                           → Aplicación Vue 3
│   ├── adapters/                  → Implementaciones de los puertos
│   │   ├── http/                  → http-palette-interpreter.ts (consumo de /api/interpret)
│   │   ├── storage/               → local-palette-storage.ts, local-saved-palette-repository.ts
│   │   └── supabase/              → client.ts, supabase-auth-gateway.ts, supabase-saved-palette-repository.ts
│   ├── application/               → Caso de uso interpret-prompt.ts
│   ├── components/                → Componentes por dominio
│   │   ├── auth/                  → AuthLayout, GoogleButton, TurnstileWidget
│   │   ├── layout/                → AppHeader, AppFooter, AccountMenu
│   │   ├── palette/               → PaletteToolbar, PaletteGrid, ColorCard, PaletteActions, AiPrompt, ExportPanel, SavePalettePanel
│   │   └── ui/                    → AppShell, AppButton
│   ├── composables/               → usePalette, useClipboard, useKeyboardShortcuts
│   ├── lib/                       → Dominio puro (sin Vue ni DOM)
│   │   ├── color.ts               → HEX/RGB/HSL, luminancia, contraste y clasificación WCAG
│   │   ├── palette.ts             → Armonías, tonos, locks, generación y adaptación del base
│   │   ├── presets.ts             → Recetas de color base
│   │   ├── export.ts              → CSS, SCSS, Tailwind v4, JSON
│   │   ├── share.ts               → URL que reproduce la paleta
│   │   ├── storage.ts             → Persistencia local versionada y migraciones
│   │   ├── saved-palette.ts       → Modelo y validación de paletas guardadas
│   │   ├── ai.ts                  → Validación de la receta devuelta por la IA
│   │   ├── auth-errors.ts         → Traducción de errores de Supabase
│   │   ├── auth-links.ts          → Redirects de confirmación y recuperación
│   │   └── turnstile.ts           → Carga del script y ciclo de vida del widget
│   ├── ports/                     → Interfaces: auth-gateway, palette-interpreter, palette-storage, saved-palette-repository
│   ├── router/                    → Definición de rutas
│   ├── stores/                    → Pinia: palette, auth, saved-palettes
│   ├── styles/                    → SCSS: abstracts (tokens), base (reset, theme), components, layout, pages
│   ├── test/                      → Dobles de prueba (fake-auth-gateway)
│   ├── views/                     → Home, Generator, SavedPalettes, Login, Register, ForgotPassword, ResetPassword, Confirm
│   ├── App.vue
│   └── main.ts
│
├── public/                        → Assets y configuración de Pages
│   ├── _headers                   → Seguridad, CSP y cache
│   ├── _redirects                 → Fallback del SPA a index.html
│   ├── _routes.json               → Limita las Functions a /api/*
│   ├── robots.txt, sitemap.xml    → Apuntan a https://palettelab.mgdc.site
│   └── llms.txt                   → Resumen de la app para asistentes de IA
│
├── supabase/                      → Stack local y migraciones
│   ├── config.toml                → Puertos propios (54521-54524) y auth
│   ├── migrations/                → saved_palettes con RLS
│   ├── templates/                 → Emails en español (confirmación y recuperación)
│   └── snippets/
│
├── .github/                       → CI/CD
│   ├── actions/setup/action.yml   → Node, Bun y caché centralizados
│   └── workflows/ci-cd.yml        → lint, typecheck, tests, build y deploy
│
├── biome.json                     → Formato y lint
├── vite.config.ts                 → Alias @, proxy BFF de /api/interpret
├── vitest.config.ts               → happy-dom y umbrales de cobertura
├── wrangler.jsonc                 → Config local de Pages (a propósito sin pages_build_output_dir)
└── tsconfig.json / tsconfig.app.json / tsconfig.node.json
```

---

## 5. Comandos de Desarrollo y Tooling

Todos los comandos se ejecutan con **Bun**:

```bash
# Desarrollo rápido con HMR (Vite hace de BFF para /api/interpret)
bun run dev

# Solo el microservicio de IA (requiere ../palette-lab-api)
bun run dev:api

# Build + Cloudflare Pages Functions locales en el puerto 8788
bun run dev:pages

# Stack completo: API + Pages
bun run dev:full

# Compilación de producción (vue-tsc + vite build)
bun run build

# Previsualización del build estático
bun run preview

# Verificación y formato con Biome
bun run check      # read-only, es lo que corre el CI
bun run lint       # aplica fixes seguros
bun run format     # solo formatea

# Tipado estricto
bun run typecheck

# Pruebas
bun run test           # suite completa
bun run test:watch     # modo interactivo
bun run test:coverage  # con umbrales (falla si bajas de 95/90/95/95)

# Supabase local
bun run supabase:start
bun run supabase:status
bun run supabase:stop
bunx supabase migration up --local
```

---

## 6. Convenciones Obligatorias para Agentes

### 6.1 Regla de Oro en Ejecución de Tests

* **NO ejecutar comandos de test de forma reactiva tras cada pequeño cambio.** Acumula todos los cambios y corre las suites al final, cuando el conjunto esté listo.
* La validación final completa es: `bun run check && bun run typecheck && bun run test:coverage`.
* Los umbrales de cobertura son vinculantes: statements 95, branches 90, functions 95, lines 95. Si bajas, `test:coverage` falla y el CI también.

### 6.2 Reglas Críticas de Negocio

* **Base anclado:** el color base vive en `BASE_INDEX` (índice central) y no se regenera, no se bloquea y se muestra como **Base**, nunca como candado.
* **Cinco swatches con HEX únicos:** cualquier generador nuevo debe garantizar cinco colores distintos.
* **Contraste AA garantizado:** el texto sobre cada color se elige entre negro y blanco para superar 4.5:1. No introduzcas colores que rompan esa garantía.
* **Los locks sobreviven a todo:** regeneración, cambio de armonía, de tono, recetas e interpretación con IA conservan los swatches bloqueados.
* **Historial de 20 estados** con coalescing de 300 ms (`HISTORY_LIMIT`, `HISTORY_COALESCE_MS` en `src/composables/usePalette.ts`). No cambies esos valores sin tests.
* **Persistencia versionada:** la clave es `palette-lab:v1` y el estado interno va en `version: 3`, con migración desde v1 y v2. Un estado viejo siempre debe poder leerse.
* **Seed determinista:** el mismo prompt produce la misma paleta (`seedFromString`). No uses aleatoriedad sin seed en rutas que deban ser reproducibles.
* **Contrato de export:** las variables `--color-1..5`, `--color-base` (CSS) y `--color-palette-*` (Tailwind v4) son contrato público. Cambiarlas obliga a actualizar tests y README.
* **Guardar requiere sesión:** el invitado genera y exporta, pero no guarda. Al iniciar sesión, las paletas locales se suben a la cuenta resolviendo conflictos por `client_id` y `updatedAt`.

### 6.3 Estilo de Código y Comentarios

* **Lenguaje:** todo el código, comentarios y documentación se redactan en **español**.
* **Comentarios:** de una sola línea, explicando el *por qué*. Sin bloques redundantes que repitan lo que el código ya dice.
* **Biome manda:** comillas simples, sin punto y coma, indentación de 2 espacios, `lineWidth: 100`. `bun run check` es la verdad; no reformatees a mano.
* **Tipado estricto:** prohibido `any`. Define interfaces explícitas para props, estados, puertos y modelos.
* **`.vue`:** Biome tiene desactivadas `noUnusedVariables`, `noUnusedImports` y `useImportType` porque su análisis no cruza `<script setup>` con el template. `vue-tsc` cubre esos casos con `noUnusedLocals`.

### 6.4 Accesibilidad Web (WCAG 2.1 AA)

* Todo elemento interactivo necesita etiqueta accesible (`aria-label`, `aria-describedby` o texto visible/oculto).
* Mantén el contraste por encima de **4.5:1** en ambos temas.
* Los formularios usan `aria-invalid` y `aria-describedby`; los grupos de botones, `aria-pressed`.
* No elimines el skip link, el foco visible ni el bloque de `prefers-reduced-motion`.

### 6.5 Flujo de Git y Despliegues

* **PROHIBIDO realizar commits o push sin la aprobación explícita del usuario.**
* **Flujo de ramas:** el desarrollo va en `develop` y se mergea a `main` mediante fast-forward una vez validado.
* **Mensajes de commit:** *Conventional Commits* en minúsculas y español (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`). Estrictamente una línea de título, sin cuerpo ni viñetas.
* **Deploy:** solo desde CI al hacer push a `main`. El job de deploy publica `dist` en Cloudflare Pages.

### 6.6 BFF y Cloudflare Pages

* **La API key nunca sale del servidor.** Vive en `.dev.vars` (local) y en las variables del proyecto de Cloudflare (producción), jamás en código, en el bundle ni en el workflow.
* **Un solo endpoint público:** `functions/api/interpret.ts` atiende `POST /api/interpret`. `public/_routes.json` limita las Functions a `/api/*`; si agregas una Function fuera de esa ruta, actualiza ese archivo o no se ejecutará.
* **Imports en Functions:** usa rutas relativas (`../../src/lib/ai`). El alias `@/` no resuelve porque los `paths` viven en `tsconfig.app.json`, y Wrangler lee el `tsconfig.json` raíz. Cloudflare Pages tampoco soporta `alias` de módulos.
* **`wrangler.jsonc` es solo local a propósito:** no declara `pages_build_output_dir`. Si lo declaras, el archivo pasa a ser fuente de verdad del proyecto en producción y las variables del dashboard dejan de administrarse desde ahí. No lo cambies sin auditar antes con `npx wrangler pages download config palette-lab`.
* **Timeout del BFF:** la llamada al microservicio se corta a los 9 segundos. No lo subas por encima del límite de ejecución de la plataforma.
