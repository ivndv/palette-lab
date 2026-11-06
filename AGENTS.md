# AGENTS.md — Palette Lab (`palette-lab`)

## 1. Visión general

**Palette Lab** es una aplicación web para crear paletas de cinco colores a partir de un único color base, con contraste WCAG garantizado y export listo para producción.

- **Propósito:** generador de paletas que combina armonías cromáticas, tonos, bloqueo de colores, deshacer/rehacer e interpretación en lenguaje natural, con persistencia dual: `localStorage` para el invitado y Supabase (PostgreSQL con RLS) para el usuario autenticado.
- **Modelo de negocio:** el invitado genera, bloquea y exporta; la cuenta solo es necesaria para guardar y sincronizar paletas.
- **Dominio en producción:** [https://palettelab.mgdc.site](https://palettelab.mgdc.site)
- **Repositorio:** el directorio todavía no tiene repositorio Git inicializado. No asumas URLs de clonado ni un remoto configurado.

## 2. Antes de tocar código

- **Arquitectura hexagonal:** respeta la dirección de dependencias descrita en §5.1. Una vista nunca llama `fetch` directo.
- **Documentación de arquitectura:** lee [`docs/diseno-y-arquitectura.md`](docs/diseno-y-arquitectura.md) antes de cambios estructurales.
- **Contrato del BFF:** el frontend llama `/api/interpret`. En desarrollo el proxy de Vite hace de BFF; en producción lo hace `functions/api/interpret.ts`. La API key de IA nunca debe llegar al navegador.
- **Reglas de dominio:** antes de refactorizar `src/lib`, revisa §8.2. Varias garantías (unicidad de HEX, contraste AA, base anclado) están cubiertas por tests y se rompen fácil con un cambio "inocente".

**CodeGraph** (índice de símbolos del repo): usa `codegraph_explore` (`query`, `maxFiles`, `projectPath`) antes de un grep masivo o de leer varios archivos; devuelve fuente verbatim, rutas de llamada e impacto.

- `codegraph sync /home/ivan/software-dev/palette-lab` tras editar, pull o cambiar de rama (incremental, uso normal).
- `codegraph index /home/ivan/software-dev/palette-lab` solo al crear el índice, tras `codegraph upgrade` o si `status` avisa `built by vX` (rebuild completo).
- `codegraph status /home/ivan/software-dev/palette-lab` para comprobar el estado.

## 3. Stack tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime & gestor** | **Bun** | `bun.lock` como lockfile |
| **Lenguaje** | **TypeScript** | `~6.0.3` (estricto, `vue-tsc` en el build) |
| **Framework** | **Vue 3** | `vue ^3.5.44` con `<script setup lang="ts">` |
| **Rutas** | **Vue Router 5** | `vue-router ^5.4.0` |
| **Estado global** | **Pinia 4** | `pinia ^4.1.0` (`stores/palette.ts`, `auth.ts`, `saved-palettes.ts`) |
| **Build** | **Vite 8** | `vite ^8.3.4`, `@vitejs/plugin-vue ^6.0.10` |
| **Estilos** | **Sass** | `sass-embedded ^1.106.1` (sin Tailwind en la app; solo en el export) |
| **Backend / BFF** | **Cloudflare Pages Functions** | `functions/api/interpret.ts` |
| **Base de datos & auth** | **Supabase** | `@supabase/supabase-js ^2.118.0`, CLI `^2.122.0`, RLS por `auth.uid()` |
| **Anti-bot** | **Cloudflare Turnstile** | Script externo, render explícito con `reset()` |
| **Interpretación con IA** | **FastAPI** (`palette-lab-api`) | Microservicio hermano, mockeable con `MOCK_AI=true` |
| **Iconografía** | **Lucide** | `@lucide/vue ^1.61.0` |
| **Linter & formatter** | **Biome 2** | `2.5.12` (`biome.json`) |
| **Pruebas unitarias** | **Vitest 5** | `vitest ^5.0.5`, `happy-dom ^21.0.4`, `@vue/test-utils ^2.5.1` |
| **Cobertura** | **V8** | `@vitest/coverage-v8`, umbrales 95/90/95/95 |
| **Infraestructura & edge** | **Cloudflare Pages** | `wrangler ^4.152.0` |
| **CI/CD** | **GitHub Actions** | `.github/workflows/ci-cd.yml` |

Estado actual: 27 archivos de pruebas, 266 tests. Cobertura sobre `src/lib` y `src/composables`: 95.34% statements, 92.51% branches, 98.15% functions, 95.27% lines.

## 4. Estructura del código

```
palette-lab/
├── functions/api/
│   ├── interpret.ts         → POST /api/interpret: valida, llama al microservicio y normaliza la receta
│   └── interpret.spec.ts    → 7 tests con fetch mockeado
├── src/
│   ├── adapters/
│   │   ├── http/            → http-palette-interpreter.ts (consumo de /api/interpret)
│   │   ├── storage/         → local-palette-storage.ts, local-saved-palette-repository.ts
│   │   └── supabase/        → client.ts, supabase-auth-gateway.ts, supabase-saved-palette-repository.ts
│   ├── application/         → interpret-prompt.ts (caso de uso)
│   ├── components/
│   │   ├── auth/            → AuthLayout, GoogleButton, TurnstileWidget
│   │   ├── layout/          → AppHeader, AppFooter, AccountMenu
│   │   ├── palette/         → PaletteToolbar, PaletteGrid, ColorCard, PaletteActions, AiPrompt,
│   │   │                      ExportPanel, SavePalettePanel
│   │   └── ui/              → AppShell, AppButton
│   ├── composables/         → usePalette, useClipboard, useKeyboardShortcuts
│   ├── lib/                 → Dominio puro (sin Vue ni DOM)
│   │   ├── color.ts         → HEX/RGB/HSL, luminancia, contraste y clasificación WCAG
│   │   ├── palette.ts       → armonías, tonos, locks, generación y adaptación del base
│   │   ├── presets.ts       → recetas de color base
│   │   ├── export.ts        → CSS, SCSS, Tailwind v4, JSON
│   │   ├── share.ts         → URL que reproduce la paleta
│   │   ├── storage.ts       → persistencia local versionada y migraciones
│   │   ├── saved-palette.ts → modelo y validación de paletas guardadas
│   │   ├── ai.ts            → validación de la receta devuelta por la IA
│   │   ├── auth-errors.ts   → traducción de errores de Supabase
│   │   ├── auth-links.ts    → redirects de confirmación y recuperación
│   │   └── turnstile.ts     → carga del script y ciclo de vida del widget
│   ├── ports/               → auth-gateway, palette-interpreter, palette-storage, saved-palette-repository
│   ├── router/              → definición de rutas
│   ├── stores/              → Pinia: palette, auth, saved-palettes
│   ├── styles/              → SCSS: abstracts (tokens), base (reset, theme), components, layout, pages
│   ├── test/                → dobles de prueba (fake-auth-gateway)
│   ├── views/               → Home, Generator, SavedPalettes, Login, Register, ForgotPassword,
│   │                          ResetPassword, Confirm
│   ├── App.vue
│   └── main.ts
├── public/                  → _headers (seguridad, CSP, cache), _redirects (fallback SPA),
│                              _routes.json (Functions solo /api/*), robots.txt y sitemap.xml
│                              (apuntan a https://palettelab.mgdc.site), llms.txt (resumen para IA)
├── supabase/                → config.toml (puertos 54521-54524), migrations/ (saved_palettes con RLS),
│                              templates/ (emails en español), snippets/
├── .github/                 → actions/setup/action.yml, workflows/ci-cd.yml
├── biome.json               → formato y lint
├── vite.config.ts           → alias @, proxy BFF de /api/interpret
├── vitest.config.ts         → happy-dom y umbrales de cobertura
├── wrangler.jsonc           → config local de Pages (a propósito sin pages_build_output_dir)
└── tsconfig.json / tsconfig.app.json / tsconfig.node.json
```

## 5. Arquitectura y flujo de datos

### 5.1 Arquitectura hexagonal

- `src/lib` es dominio puro: sin Vue, sin DOM y sin `fetch`.
- Los efectos externos viven en `src/adapters` detrás de interfaces declaradas en `src/ports`.
- Los casos de uso pequeños viven en `src/application`.
- Las vistas consumen stores de Pinia (`stores/palette.ts`, `auth.ts`, `saved-palettes.ts`); nunca llaman `fetch` directo.

### 5.2 BFF y contrato `/api/interpret`

- **Un solo endpoint público:** `functions/api/interpret.ts` atiende `POST /api/interpret`. `public/_routes.json` limita las Functions a `/api/*`; si agregas una Function fuera de esa ruta, actualiza ese archivo o no se ejecutará.
- **La API key nunca sale del servidor:** vive en `.dev.vars` (local) y en las variables del proyecto de Cloudflare (producción), jamás en código, en el bundle ni en el workflow.
- **Imports en Functions:** usa rutas relativas (`../../src/lib/ai`). El alias `@/` no resuelve porque los `paths` viven en `tsconfig.app.json`, y Wrangler lee el `tsconfig.json` raíz. Cloudflare Pages tampoco soporta `alias` de módulos.
- **Timeout del BFF:** la llamada al microservicio se corta a los 9 segundos. No lo subas por encima del límite de ejecución de la plataforma.
- **`wrangler.jsonc` es solo local a propósito:** no declara `pages_build_output_dir`. Si lo declaras, el archivo pasa a ser fuente de verdad del proyecto en producción y las variables del dashboard dejan de administrarse desde ahí. No lo cambies sin auditar antes con `npx wrangler pages download config palette-lab`.

### 5.3 Persistencia y sincronización

- Invitado: `localStorage` versionado.
- Usuario autenticado: Supabase, con RLS por `auth.uid()`.

## 6. Variables de entorno

| Variable | Uso |
| :--- | :--- |
| `PALETTE_LAB_API_URL` | URL del microservicio `palette-lab-api` para el BFF |
| `PALETTE_LAB_API_KEY` | Secreto compartido con el BFF; en producción vive en Cloudflare Pages, no en el navegador |
| `VITE_SUPABASE_URL` | URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `VITE_TURNSTILE_SITE_KEY` | Site key pública de Turnstile |

Google OAuth no va en `.env`: se carga en `supabase/.env` y se activa en `[auth.external.google]` de `supabase/config.toml`.

## 7. Comandos

Todos los comandos se ejecutan con **Bun**:

```bash
bun run dev                    # Desarrollo rápido con HMR (Vite hace de BFF para /api/interpret)
bun run dev:api                # Solo el microservicio de IA (requiere ../palette-lab-api)
bun run dev:pages              # Build + Cloudflare Pages Functions locales en el puerto 8788
bun run dev:full               # Stack completo: API + Pages
bun run build                  # Compilación de producción (vue-tsc + vite build)
bun run preview                # Previsualización del build estático
bun run check                  # Verificación y formato (read-only, es lo que corre el CI)
bun run lint                   # Aplica fixes seguros
bun run format                 # Solo formatea
bun run typecheck              # Tipado estricto
bun run test                   # Suite completa de pruebas
bun run test:watch             # Pruebas en modo interactivo
bun run test:coverage          # Pruebas con umbrales (falla si bajas de 95/90/95/95)
bun run supabase:start         # Levanta Supabase local
bun run supabase:status        # Estado de Supabase local
bun run supabase:stop          # Detiene Supabase local
bunx supabase migration up --local  # Aplica migraciones en la base local
```

## 8. Convenciones y reglas críticas

### 8.1 Ejecución de tests

- **No ejecutes tests de forma reactiva tras cada pequeño cambio.** Acumula todos los cambios y corre las suites al final, cuando el conjunto esté listo.
- La validación final completa es: `bun run check && bun run typecheck && bun run test:coverage`.
- Los umbrales de cobertura son vinculantes: statements 95, branches 90, functions 95, lines 95. Si bajas, `test:coverage` falla y el CI también.

### 8.2 Reglas críticas de negocio

- **Base anclado:** el color base vive en `BASE_INDEX` (índice central) y no se regenera, no se bloquea y se muestra como **Base**, nunca como candado.
- **Cinco swatches con HEX únicos:** cualquier generador nuevo debe garantizar cinco colores distintos.
- **Contraste AA garantizado:** el texto sobre cada color se elige entre negro y blanco para superar 4.5:1. No introduzcas colores que rompan esa garantía.
- **Los locks sobreviven a todo:** regeneración, cambio de armonía, de tono, recetas e interpretación con IA conservan los swatches bloqueados.
- **Historial de 20 estados** con coalescing de 300 ms (`HISTORY_LIMIT`, `HISTORY_COALESCE_MS` en `src/composables/usePalette.ts`). No cambies esos valores sin tests.
- **Persistencia versionada:** la clave es `palette-lab:v1` y el estado interno va en `version: 3`, con migración desde v1 y v2. Un estado viejo siempre debe poder leerse.
- **Seed determinista:** el mismo prompt produce la misma paleta (`seedFromString`). No uses aleatoriedad sin seed en rutas que deban ser reproducibles.
- **Contrato de export:** las variables `--color-1..5`, `--color-base` (CSS) y `--color-palette-*` (Tailwind v4) son contrato público. Cambiarlas obliga a actualizar tests y README.
- **Guardar requiere sesión:** el invitado genera y exporta, pero no guarda. Al iniciar sesión, las paletas locales se suben a la cuenta resolviendo conflictos por `client_id` y `updatedAt`.

### 8.3 Estilo de código y comentarios

- **Lenguaje:** todo el código, comentarios y documentación se redactan en **español**.
- **Comentarios:** de una sola línea, explicando el *por qué*. Sin bloques redundantes que repitan lo que el código ya dice.
- **Biome manda:** comillas simples, sin punto y coma, indentación de 2 espacios, `lineWidth: 100`. `bun run check` es la verdad; no reformatees a mano.
- **Tipado estricto:** prohibido `any`. Define interfaces explícitas para props, estados, puertos y modelos.
- **`.vue`:** Biome tiene desactivadas `noUnusedVariables`, `noUnusedImports` y `useImportType` porque su análisis no cruza `<script setup>` con el template. `vue-tsc` cubre esos casos con `noUnusedLocals`.

### 8.4 Accesibilidad web (WCAG 2.1 AA)

- Todo elemento interactivo necesita etiqueta accesible (`aria-label`, `aria-describedby` o texto visible/oculto).
- Mantén el contraste por encima de **4.5:1** en ambos temas.
- Los formularios usan `aria-invalid` y `aria-describedby`; los grupos de botones, `aria-pressed`.
- No elimines el skip link, el foco visible ni el bloque de `prefers-reduced-motion`.

## 9. Flujo de Git y despliegue

- **Prohibido** realizar commits o push sin la aprobación explícita del usuario.
- El desarrollo va en `develop`; el merge a `main` solo se hace con aprobación.
- Mensajes de commit con *Conventional Commits*, en minúsculas y español (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`). Estrictamente una línea de título, sin cuerpo ni viñetas.
- El deploy se hace solo desde CI al hacer push a `main`; el job publica `dist` en Cloudflare Pages.

## 10. CI/CD

`.github/workflows/ci-cd.yml` ejecuta lint, typecheck, tests, build y deploy. El setup de Node, Bun y caché está centralizado en `.github/actions/setup/action.yml`.
