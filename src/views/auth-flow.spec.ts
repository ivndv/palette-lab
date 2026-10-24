// Pruebas de registro, recuperación y confirmación

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, type Pinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { resetAuthGateway, setAuthGateway } from '@/stores/auth'
import { FakeAuthGateway, fakeSession } from '@/test/fake-auth-gateway'
import ConfirmView from './ConfirmView.vue'
import ForgotPasswordView from './ForgotPasswordView.vue'
import RegisterView from './RegisterView.vue'
import ResetPasswordView from './ResetPasswordView.vue'

const TurnstileStub = defineComponent({
  name: 'TurnstileWidget',
  emits: ['token'],
  setup(_props, { emit, expose }) {
    expose({ reset: () => emit('token', '') })

    return () =>
      h(
        'button',
        {
          type: 'button',
          'data-test': 'captcha',
          onClick: () => emit('token', 'token-1'),
        },
        'captcha',
      )
  },
})

let pinia: Pinia
let router: Router
let gateway: FakeAuthGateway

function globalOptions() {
  return {
    plugins: [pinia, router],
    stubs: { TurnstileWidget: TurnstileStub },
  }
}

async function go(path: string): Promise<void> {
  await router.push(path)
  await router.isReady()
}

beforeEach(() => {
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  gateway = new FakeAuthGateway()
  setAuthGateway(gateway)
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { render: () => null } },
      { path: '/registro', name: 'register', component: { render: () => null } },
      { path: '/recuperar', name: 'forgot', component: { render: () => null } },
      { path: '/restablecer', name: 'reset', component: { render: () => null } },
      { path: '/confirmar', name: 'confirm', component: { render: () => null } },
      {
        path: '/mis-paletas',
        name: 'saved',
        component: { render: () => null },
      },
      {
        path: '/generador',
        name: 'generator',
        component: { render: () => null },
      },
    ],
  })
})

afterEach(() => {
  resetAuthGateway()
})

describe('RegisterView', () => {
  it('avisa si las contraseñas no coinciden', async () => {
    const wrapper = mount(RegisterView, { global: globalOptions() })

    await wrapper.get('#register-email').setValue('iva@example.com')
    await wrapper.get('#register-password').setValue('secret123')
    await wrapper.get('#register-confirm').setValue('otra123')
    await wrapper.get('[data-test="captcha"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('no coinciden')
    expect(gateway.signUpCalls).toHaveLength(0)
  })

  it('registra y pide confirmar el email', async () => {
    gateway.keepUnconfirmed = true
    await go('/registro?redirect=/generador')
    const wrapper = mount(RegisterView, { global: globalOptions() })

    await wrapper.get('#register-email').setValue('iva@example.com')
    await wrapper.get('#register-password').setValue('secret123')
    await wrapper.get('#register-confirm').setValue('secret123')
    await wrapper.get('[data-test="captcha"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(gateway.signUpCalls[0].options?.captchaToken).toBe('token-1')
    expect(wrapper.text()).toContain('Revisá tu email')
    expect(router.currentRoute.value.path).toBe('/registro')
  })

  it('inicia sesión con Google desde el registro', async () => {
    await go('/registro?redirect=/generador')
    const wrapper = mount(RegisterView, { global: globalOptions() })

    await wrapper.get('.auth-button--secondary').trigger('click')
    await flushPromises()

    expect(gateway.googleCalls[0]).toContain('/generador')
  })
})

describe('ForgotPasswordView', () => {
  it('envía el enlace con captcha', async () => {
    const wrapper = mount(ForgotPasswordView, { global: globalOptions() })

    await wrapper.get('#recover-email').setValue('iva@example.com')
    await wrapper.get('[data-test="captcha"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(gateway.resetCalls[0]).toMatchObject({
      email: 'iva@example.com',
      captchaToken: 'token-1',
    })
    expect(wrapper.text()).toContain('enlace')
  })

  it('muestra el error del servidor', async () => {
    gateway.failReset = { code: 'over_email_send_rate_limit' }
    const wrapper = mount(ForgotPasswordView, { global: globalOptions() })

    await wrapper.get('#recover-email').setValue('iva@example.com')
    await wrapper.get('[data-test="captcha"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('demasiados emails')
  })
})

describe('ResetPasswordView', () => {
  it('muestra el enlace inválido sin sesión', async () => {
    await go('/restablecer?error=access_denied')
    const wrapper = mount(ResetPasswordView, { global: globalOptions() })
    await flushPromises()

    expect(wrapper.text()).toContain('Enlace inválido')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Pedir otro enlace')
  })

  it('guarda la contraseña nueva', async () => {
    gateway.session = fakeSession()
    await go('/restablecer')
    const wrapper = mount(ResetPasswordView, { global: globalOptions() })
    await flushPromises()

    await wrapper.get('#reset-password').setValue('nueva123')
    await wrapper.get('#reset-confirm').setValue('nueva123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(gateway.passwordUpdates).toEqual(['nueva123'])
    expect(router.currentRoute.value.path).toBe('/mis-paletas')
  })

  it('avisa si las contraseñas no coinciden', async () => {
    gateway.session = fakeSession()
    await go('/restablecer')
    const wrapper = mount(ResetPasswordView, { global: globalOptions() })
    await flushPromises()

    await wrapper.get('#reset-password').setValue('nueva123')
    await wrapper.get('#reset-confirm').setValue('otra123')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('no coinciden')
    expect(gateway.passwordUpdates).toHaveLength(0)
  })
})

describe('ConfirmView', () => {
  it('redirige cuando la sesión quedó creada', async () => {
    gateway.session = fakeSession()
    await go('/confirmar')
    mount(ConfirmView, { global: globalOptions() })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/mis-paletas')
  })

  it('avisa cuando el enlace no es válido', async () => {
    await go('/confirmar')
    const wrapper = mount(ConfirmView, { global: globalOptions() })
    await flushPromises()

    expect(wrapper.text()).toContain('No pudimos confirmar')
    expect(wrapper.text()).toContain('Volver a entrar')
  })
})
