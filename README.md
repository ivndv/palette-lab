# Palette Lab

## Descripción

Aplicación web para crear paletas de cinco colores a partir de un solo color base. El objetivo es que cualquier persona pueda armar una paleta coherente, comprobar que el texto se lee sobre cada color y llevarse el resultado listo para pegar en un proyecto real, sin abrir un editor de diseño ni calcular contraste a mano.

El base queda anclado en el centro de la paleta y los otros cuatro colores se derivan de él según una armonía y un tono. Todo se puede bloquear, deshacer, exportar y, con cuenta, guardar en la nube.

## Características

- **Cinco colores desde un base**: el color elegido ocupa el centro y los otros cuatro se derivan de él.
- **Cinco armonías y seis tonos**: análoga, complementaria dividida, tríada, monocromática y aleatoria, del pastel al oscuro.
- **Contraste WCAG por color**: ratio calculado con texto negro o blanco elegido automáticamente para garantizar AA 4.5:1.
- **Bloqueo, deshacer y rehacer**: los colores bloqueados sobreviven a cualquier regeneración; historial de 20 estados.
- **Interpretación en lenguaje natural**: una idea como *atardecer en la playa* elige base, armonía y tono, siempre con el mismo resultado.
- **Export listo para producción**: variables CSS y SCSS, tema de Tailwind v4, JSON con contraste y una URL que reproduce la paleta.
- **Paletas guardadas**: el invitado genera y exporta; con cuenta se guardan, renombran, duplican y sincronizan.
- **Autenticación y accesibilidad**: email, Google y recuperación con Turnstile; navegación por teclado y foco visible.

## Secciones

1. **Inicio**: presentación y acceso directo al generador.
2. **Generador**: color base, armonías, tonos, recetas, bloqueo, deshacer/rehacer, panel de IA y exportación.
3. **Mis Paletas**: paletas guardadas con apertura, renombrado, duplicado y eliminación. Requiere sesión.
4. **Autenticación**: inicio de sesión, registro, recuperación, restablecimiento y confirmación de email.

## Uso

- **Acceder a la Aplicación**: entra directamente desde cualquier navegador aquí: [Palette Lab](https://palettelab.mgdc.site/).
- **Modo invitado o cuenta**: genera, bloquea y exporta sin registrarte; crea una cuenta solo si quieres conservar tus paletas entre dispositivos.
- **Armar una paleta**: elige un color base, una armonía y un tono; bloquea los que te gusten y regenera el resto.
- **Describir una idea**: escribe una escena o un concepto en el panel de IA y la app propone base, armonía y tono.
- **Exportar**: elige CSS, SCSS, Tailwind v4, JSON o URL, revisa la vista previa y copia o descarga el resultado.
- **Atajos de teclado**: `Espacio` regenera, `U` deshace, `R` aplica un color aleatorio, `Ctrl/Cmd + Z` y `Ctrl/Cmd + Shift + Z` recorren el historial.

## Tecnologías Utilizadas

- **Frontend**: Vue 3.5, TypeScript 6, Vite 8, Sass
- **Estado y Rutas**: Pinia 4, Vue Router 5
- **Backend / BFF**: Cloudflare Pages Functions
- **Base de Datos y Auth**: Supabase (PostgreSQL, Auth con RLS por `auth.uid()`)
- **Anti-Bot**: Cloudflare Turnstile
- **Interpretación con IA**: microservicio propio `palette-lab-api` (FastAPI)
- **Testing**: Vitest 5, happy-dom, `@vue/test-utils`
- **Herramientas**: Bun, Biome 2, `vue-tsc`
- **Infra & CI/CD**: Cloudflare Pages, GitHub Actions

## Despliegue

La aplicación se encuentra desplegada en **Cloudflare Pages**. Puedes usarla directamente aquí: [palettelab.mgdc.site](https://palettelab.mgdc.site/)

## Licencia

Licencia de Uso Personal:

Este software es propiedad de **Ivan Cruz**. Se permite el uso de este software solo para fines personales y no comerciales. No se permite la distribución, modificación ni uso comercial de este software sin el consentimiento expreso de **Ivan Cruz**.

Cualquier uso no autorizado puede resultar en acciones legales.
