// Modelo de sesión propio, independiente del proveedor de auth

export interface Usuario {
  id: string
  email: string
}

export interface Sesion {
  user: Usuario
  accessToken: string
}
