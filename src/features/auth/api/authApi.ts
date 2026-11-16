const localApiUrl = `${window.location.protocol}//${window.location.hostname}:5223`
const productionApiUrl = 'https://saru-engine.onrender.com'
const configuredApiUrl = import.meta.env.VITE_SARU_API_URL?.trim()

export const API_URL = (
  configuredApiUrl || (import.meta.env.DEV ? localApiUrl : productionApiUrl)
).replace(/\/$/, '')

export type AuthUser = {
  id: string
  fullName: string
  email: string | null
  roles: string[]
  isVisitor: boolean
}

export type AuthSession = {
  accessToken: string
  tokenType: string
  expiresAt: string
  refreshTokenExpiresAt: string
  user: AuthUser
}

export type RegisterUserInput = {
  firstName: string
  lastName: string
  cpf: string
  email: string
  password: string
  phoneNumber: string | null
  registration: string | null
  badgeNumber: string | null
  role: 'Student' | 'Professor' | 'Employee' | 'Visitor'
  subProfile: number | null
}

type ProblemDetails = {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string[]>

  constructor(status: number, problem: ProblemDetails) {
    const firstFieldError = Object.values(problem.errors ?? {}).flat()[0]
    super(problem.detail ?? firstFieldError ?? problem.title ?? 'Não foi possível concluir a solicitação.')
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = problem.errors ?? {}
  }
}

let accessToken: string | null = null

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (authenticated && accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(0, {
      detail: 'Não foi possível conectar à Saru Engine. Verifique se a API está disponível.',
    })
  } finally {
    window.clearTimeout(timeout)
  }

  if (response.status === 204) return undefined as T

  const isJson = response.headers.get('content-type')?.includes('json')
  const body = isJson ? await response.json() : undefined

  if (!response.ok) throw new ApiError(response.status, (body ?? {}) as ProblemDetails)
  return body as T
}

export function authenticatedRequest<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, true)
}

function saveSession(session: AuthSession) {
  accessToken = session.accessToken
  return session
}

export async function login(email: string, password: string) {
  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return saveSession(session)
}

export async function refreshSession() {
  const session = await request<AuthSession>('/auth/refresh', { method: 'POST' })
  return saveSession(session)
}

export async function logout() {
  try {
    await request<void>('/auth/logout', { method: 'POST' })
  } finally {
    accessToken = null
  }
}

export function registerUser(input: RegisterUserInput) {
  return request('/Users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function forgotPassword(email: string) {
  return request<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(email: string, token: string, newPassword: string) {
  return request<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  })
}

export function getAccessToken() {
  return accessToken
}
