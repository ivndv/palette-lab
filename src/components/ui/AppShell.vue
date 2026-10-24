<template>
  <!-- Salto de accesibilidad -->
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

  <div class="app-shell">
    <header class="app-shell__header">
      <slot name="header" />
    </header>

    <!-- main enfocable para que el skip link funcione -->
    <main id="contenido" class="app-shell__main" tabindex="-1">
      <slot />
    </main>

    <footer class="app-shell__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>
