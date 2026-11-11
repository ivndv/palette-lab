// Configuración global de los tests: i18n disponible en todos los mounts

import { config } from '@vue/test-utils'
import { i18n } from '@/i18n'

config.global.plugins = [i18n]
