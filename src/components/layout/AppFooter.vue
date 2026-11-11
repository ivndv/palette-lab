<script setup lang="ts">
// Footer con navegación, proyecto y stack

import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()

const anio = new Date().getFullYear()

const navegacion = computed(() => [
  { to: '/', label: t('footer.home') },
  { to: '/generador', label: t('footer.generator') },
  { to: '/mis-paletas', label: t('footer.saved') },
])

const proyecto = computed(() => [
  { href: 'https://github.com/ivndv', label: t('footer.github') },
  { href: 'https://github.com/ivndv/palette-lab', label: t('footer.repository') },
  {
    href: 'https://github.com/ivndv/palette-lab#readme',
    label: t('footer.documentation'),
  },
])

const tecnologias = ['Vue 3', 'TypeScript', 'Sass', 'Vite']
</script>

<template>
  <div class="site-footer">
    <div class="site-footer__grid">
      <div class="site-footer__identity">
        <RouterLink class="brand" to="/" :aria-label="t('header.brandAria')">
          <img
            class="brand__icon brand__icon--small"
            src="/favicon.svg"
            alt=""
            width="28"
            height="28"
          />
          <span class="brand__name">palette lab</span>
        </RouterLink>

        <p>{{ t('footer.description') }}</p>

        <a
          class="site-footer__icon"
          href="https://github.com/ivndv"
          target="_blank"
          rel="noreferrer"
          :aria-label="t('footer.githubAria')"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
            />
          </svg>
        </a>
      </div>

      <!-- Landmark de navegación con título accesible -->
      <nav class="site-footer__column" aria-labelledby="footer-navigation-title">
        <h3 id="footer-navigation-title">{{ t('footer.navigation') }}</h3>
        <ul>
          <li v-for="enlace in navegacion" :key="enlace.to">
            <RouterLink :to="enlace.to">{{ enlace.label }}</RouterLink>
          </li>
        </ul>
      </nav>

      <div class="site-footer__column">
        <h3>{{ t('footer.project') }}</h3>
        <ul>
          <li v-for="enlace in proyecto" :key="enlace.href">
            <a :href="enlace.href" target="_blank" rel="noreferrer">
              {{ enlace.label }}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="site-footer__bottom">
      <p>© {{ anio }} Palette Lab · {{ t('footer.builtBy') }} <span>Ivan Cruz</span></p>

      <div class="site-footer__tech">
        <span v-for="tech in tecnologias" :key="tech">{{ tech }}</span>
      </div>
    </div>
  </div>
</template>
