# Palette Lab

## Descripción

Aplicación web para crear paletas de cinco colores a partir de un solo color base. El objetivo es que cualquier persona pueda armar una paleta coherente, verificar que el texto sea legible sobre cada color y llevarse el resultado listo para pegar en un proyecto real, sin abrir un editor de diseño ni calcular contraste a mano.

El base queda anclado en el centro de la paleta y el resto de los colores se derivan de él según una armonía y un tono. Todo se puede bloquear, deshacer, exportar y, si hay cuenta, guardar en la nube.

## Características

- **Cinco colores desde un base**: el color elegido ocupa el centro de la paleta y los otros cuatro se derivan de él.
- **Cinco armonías**: análoga, complementaria dividida, tríada, monocromática y aleatoria, con separación de tono controlada.
- **Seis tonos**: equilibrado, pastel, vívido, sobrio, oscuro y claro. El tono ajusta saturación y luminosidad, y el base se adapta conservando su hue.
- **Contraste WCAG por color**: ratio calculado y nivel (`AAA`, `AA`, `AA Large`, `Fail`), con texto negro o blanco elegido automáticamente para garantizar `AA` 4.5:1.
- **Bloqueo de colores**: los swatches bloqueados sobreviven a cualquier regeneración, cambio de armonía, de tono o de receta. El base se muestra como **Base**, no como candado.
- **Deshacer y rehacer**: historial de 20 estados, también disponible con teclado.
- **Interpretación en lenguaje natural**: describís una idea como *atardecer en la playa* y la app elige base, armonía y tono. El mismo texto produce siempre la misma paleta.
- **Export listo para producción**: variables CSS, variables SCSS, tema de Tailwind v4, JSON enriquecido con contraste y nivel WCAG, y una URL que reproduce la paleta exacta.
- **Paletas guardadas**: el invitado puede generar y exportar; con cuenta puede guardar, renombrar, duplicar y eliminar, y todo se sincroniza en la nube.
- **Autenticación completa**: email y contraseña con confirmación por correo, acceso con Google y recuperación de contraseña, protegido con Cloudflare Turnstile.
- **Accesibilidad**: skip link, foco visible, landmarks, formularios con `aria-invalid` y `aria-describedby`, grupos de botones con `aria-pressed` y respeto por `prefers-reduced-motion`.

## Secciones

1. **Inicio**: presentación de la herramienta y acceso directo al generador.
2. **Generador**: selector de color base, armonías, tonos, recetas, bloqueo, deshacer/rehacer, panel de IA, exportación y guardado.
3. **Mis Paletas**: listado de paletas guardadas con apertura, renombrado, duplicado y eliminación. Requiere sesión.
4. **Autenticación**: inicio de sesión, registro, recuperación, restablecimiento y cierre de la confirmación de email.
5. **Exportación**: formato, vista previa, copiar y descargar, todo dentro del generador.

## Uso

- **Acceder a la Aplicación**: entra directamente desde cualquier navegador aquí: [Palette Lab](https://palettelab.mgdc.site/).
- **Modo Invitado o Cuenta**: genera, bloquea y exporta sin registrarte; crea una cuenta solo si querés conservar tus paletas entre dispositivos.
- **Armar una Paleta**: elegí un color base, una armonía y un tono. Bloqueá los colores que te gusten y regenerá el resto.
- **Describir una Idea**: escribí una escena o un concepto en el panel de IA y la app propone base, armonía y tono. Los ejemplos solo rellenan el campo; vos decidís cuándo interpretar.
- **Exportar**: elegí CSS, SCSS, Tailwind v4, JSON o URL, revisá la vista previa y copiá o descargá el resultado.
- **Atajos de Teclado**: `Espacio` regenera, `U` deshace, `R` aplica un color aleatorio, `Ctrl/Cmd + Z` y `Ctrl/Cmd + Shift + Z` recorren el historial.

## Tecnologías Utilizadas

- **Frontend**: Vue 3.5, TypeScript 6, Vite 8, Sass (`sass-embedded`)
- **Estado y Rutas**: Pinia 4, Vue Router 5
- **Backend / BFF**: Cloudflare Pages Functions
- **Base de Datos y Auth**: Supabase (PostgreSQL, Auth con RLS por `auth.uid()`)
- **Anti-Bot**: Cloudflare Turnstile
- **Interpretación con IA**: microservicio propio `palette-lab-api` (FastAPI), consumido desde el servidor
- **Iconografía**: `@lucide/vue`
- **Testing**: Vitest 5, happy-dom, `@vue/test-utils`
- **Herramientas**: Bun, Biome 2, `vue-tsc`
- **Infra & CI/CD**: Cloudflare Pages, GitHub Actions

## Despliegue

La aplicación se despliega en **Cloudflare Pages** mediante GitHub Actions en cada push a `main`. El build es `bun run build` y el directorio publicado es `dist`.

- **Variables de build**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`
- **Secrets del repositorio**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **Runtime de la Function**: `PALETTE_LAB_API_URL` y `PALETTE_LAB_API_KEY` se configuran en el proyecto de Cloudflare, nunca en el workflow ni en el navegador

Puedes usarla directamente aquí: [palettelab.mgdc.site](https://palettelab.mgdc.site/)

## Licencia

Licencia de Uso Personal:

Este software es propiedad de **Ivan Cruz**. Se permite el uso de este software solo para fines personales y no comerciales. No se permite la distribución, modificación ni uso comercial de este software sin el consentimiento expreso de **Ivan Cruz**.

Cualquier uso no autorizado puede resultar en acciones legales.
