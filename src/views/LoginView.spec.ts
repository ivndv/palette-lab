// Pruebas de la vista de login

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, type Pinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { resetAuthGateway, setAuthGateway, useAuthStore } from '@/stores/auth'
import { FakeAuthGateway, fakeSession } from '@/test/fake-auth-gateway'
import LoginView from './LoginView.vue'

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

async function mountLogin(query = '') {
  await router.push(`/login${query}`)
  await router.isReady()

  return mount(LoginView, {
    global: {
      plugins: [pinia, router],
      stubs: { TurnstileWidget: TurnstileStub },
    },
  })
}

async function fillValidForm(wrapper: Awaited<ReturnType<typeof mountLogin>>) {
  await wrapper.get('#login-email').setValue('iva@example.com')
  await wrapper.get('#login-password').setValue('secret123')
  await wrapper.get('[data-test="captcha"]').trigger('click')
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

describe('LoginView', () => {
  it('mantiene el submit deshabilitado hasta completar todo', async () => {
    const wrapper = await mountLogin()
    const submit = wrapper.get('button[type="submit"]')

    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('#login-email').setValue('iva@example.com')
    await wrapper.get('#login-password').setValue('secret123')

    expect(submit.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="captcha"]').trigger('click')

    expect(submit.attributes('disabled')).toBeUndefined()
  })

  it('inicia sesión y vuelve al redirect pedido', async () => {
    const wrapper = await mountLogin('?redirect=/generador')

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(gateway.signInCalls[0]).toMatchObject({
      email: 'iva@example.com',
      captchaToken: 'token-1',
    })
    expect(router.currentRoute.value.path).toBe('/generador')
  })

  it('muestra el error y reinicia el captcha', async () => {
    const wrapper = await mountLogin()
    gateway.failSignIn = { code: 'invalid_credentials' }

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Email o contraseña incorrectos')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('ofrece reenviar la confirmación', async () => {
    const wrapper = await mountLogin()
    gateway.failSignIn = { code: 'email_not_confirmed' }

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const resend = wrapper.findAll('button').find((button) => button.text().includes('Reenviar'))

    expect(resend).toBeDefined()
    expect(resend?.attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="captcha"]').trigger('click')
    await resend?.trigger('click')
    await flushPromises()

    expect(gateway.resendCalls[0]).toMatchObject({
      email: 'iva@example.com',
      captchaToken: 'token-1',
    })
    expect(wrapper.text()).toContain('email nuevo')
  })

  it('inicia el flujo de Google', async () => {
    const wrapper = await mountLogin('?redirect=/generador')

    await wrapper.get('.auth-button--secondary').trigger('click')
    await flushPromises()

    expect(gateway.googleCalls[0]).toBe(`${window.location.origin}/generador`)
  })

  it('redirige si ya hay sesión', async () => {
    gateway.session = fakeSession()
    const auth = useAuthStore()

    await auth.initialize()
    await mountLogin('?redirect=/generador')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/generador')
  })

  it('arma el link de registro con el redirect', async () => {
    const wrapper = await mountLogin('?redirect=/generador')
    const link = wrapper.findAll('a').find((item) => item.text().includes('Creá tu cuenta'))

    expect(link?.attributes('href')).toContain('/registro')
  })

  it('bloquea redirects externos', async () => {
    const wrapper = await mountLogin('?redirect=https://evil.test')

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/mis-paletas')
  })
})
