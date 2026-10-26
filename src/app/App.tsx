import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Page } from './types'
import {
  ApiError,
  forgotPassword,
  login,
  logout,
  refreshSession,
  registerUser,
  resetPassword,
} from '../features/auth/api/authApi'
import type { AuthSession, RegisterUserInput } from '../features/auth/api/authApi'
import {
  ForgotPasswordPage,
  LoginPage,
  RecoverySentPage,
  ResetPasswordPage,
  SessionLoading,
  SignupPage,
} from '../features/auth/AuthPages'
import { DashboardPage } from '../features/home/DashboardPage'
import { ReservationsPage } from '../features/reservations/ReservationsPage'
import {
  cancelReservation as cancelReservationRequest,
  getReservations,
  updateReservation,
} from '../features/reservations/api/reservationsApi'
import type { Reservation, ReservationDraft } from '../features/reservations/model'
import { SettingsPage } from '../features/settings/SettingsPage'
import { createPixPayment, getPixPayment } from '../features/reservations/api/paymentsApi'
import type { PixPayment } from '../features/reservations/api/paymentsApi'
import { PixPaymentDialog } from '../features/reservations/PixPaymentDialog'

function App() {
  const resetParameters = useMemo(() => new URLSearchParams(window.location.search), [])
  const isResetLink = window.location.pathname.replace(/\/$/, '') === '/reset-password'
  const [page, setPage] = useState<Page>(isResetLink ? 'reset-password' : 'login')
  const [session, setSession] = useState<AuthSession | null>(null)
  const [authReady, setAuthReady] = useState(isResetLink)
  const [dark, setDark] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [payment, setPayment] = useState<PixPayment | null>(null)
  const checkout = useRef<{ signature: string; id: string } | null>(null)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const resetEmail = resetParameters.get('email') ?? ''
  const resetToken = resetParameters.get('token') ?? ''

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4200); return () => window.clearTimeout(timer) }, [toast])

  useEffect(() => {
    if (isResetLink) return
    let active = true
    refreshSession()
      .then((restoredSession) => {
        if (!active) return
        setReservationsLoading(true)
        setSession(restoredSession)
        setPage('home')
      })
      .catch((requestError) => {
        if (active && requestError instanceof ApiError && requestError.status === 0) setToast(requestError.message)
      })
      .finally(() => { if (active) setAuthReady(true) })
    return () => { active = false }
  }, [isResetLink])

  useEffect(() => {
    if (!session) return
    const refreshAt = Math.max(new Date(session.expiresAt).getTime() - Date.now() - 60_000, 1_000)
    const timer = window.setTimeout(() => {
      refreshSession().then(setSession).catch(() => {
        setSession(null)
        setPayment(null)
        checkout.current = null
        setReservations([])
        setReservationsLoading(false)
        setPage('login')
        setToast('Sua sessão expirou. Entre novamente.')
      })
    }, refreshAt)
    return () => window.clearTimeout(timer)
  }, [session])

  const reservationUserId = session?.user.id

  useEffect(() => {
    if (!reservationUserId) return

    let active = true
    getReservations(true)
      .then((loadedReservations) => { if (active) setReservations(loadedReservations) })
      .catch((requestError) => {
        if (!active) return
        setToast(requestError instanceof ApiError ? requestError.message : 'Não foi possível carregar suas reservas.')
      })
      .finally(() => { if (active) setReservationsLoading(false) })

    return () => { active = false }
  }, [reservationUserId])

  const toggleTheme = () => setDark((current) => !current)
  const goToLogin = () => { window.history.replaceState({}, '', '/'); setPage('login') }

  const createReservations = async (drafts: ReservationDraft[]) => {
    const signature = JSON.stringify([session?.user.id, drafts])
    if (checkout.current?.signature !== signature) checkout.current = { signature, id: crypto.randomUUID() }
    try {
      const createdPayment = await createPixPayment(checkout.current.id, drafts)
      setPayment(createdPayment)
      checkout.current = null
      getReservations(true).then(setReservations).catch(() => undefined)
    } catch (requestError) {
      getReservations(true).then(setReservations).catch(() => undefined)
      throw requestError
    }
  }

  const reloadReservations = useCallback(async () => {
    const loaded = await getReservations(true)
    setReservations(loaded)
  }, [])

  const openPayment = async (id: string) => {
    try { setPayment(await getPixPayment(id)) }
    catch (requestError) { setToast(requestError instanceof ApiError ? requestError.message : 'Não foi possível carregar o pagamento.') }
  }

  const cancelReservation = async (id: string) => {
    try {
      await cancelReservationRequest(id)
      await reloadReservations()
      setToast('Cancelamento registrado. Se houver pagamento, acompanhe o estorno nas reservas.')
    } catch (requestError) {
      setToast(requestError instanceof ApiError ? requestError.message : 'Não foi possível cancelar a reserva.')
    }
  }

  const editReservation = async (id: string, draft: ReservationDraft) => {
    const updatedReservation = await updateReservation(id, draft)
    setReservations((current) => current.map((reservation) => reservation.id === id ? updatedReservation : reservation))
    setToast('Reserva atualizada com sucesso.')
  }

  const authenticate = async (email: string, password: string) => {
    const authenticatedSession = await login(email, password)
    setPayment(null)
    checkout.current = null
    setReservationsLoading(true)
    setSession(authenticatedSession)
    setPage('home')
  }

  const completeSignup = async (input: RegisterUserInput) => {
    await registerUser(input)
    goToLogin()
    setToast('Cadastro concluído. Agora você já pode entrar.')
  }

  const submitRecovery = async (email: string) => {
    await forgotPassword(email)
    setRecoveryEmail(email)
    setPage('recovery-sent')
  }

  const completeReset = async (password: string) => {
    await resetPassword(resetEmail, resetToken, password)
    setSession(null)
    goToLogin()
    setToast('Senha redefinida com sucesso. Entre com a nova senha.')
  }

  const endSession = async () => {
    try {
      await logout()
    } finally {
      setSession(null)
      setPayment(null)
      checkout.current = null
      setReservations([])
      goToLogin()
      setToast('Você saiu da sua conta.')
    }
  }

  if (!authReady) return <SessionLoading dark={dark} onToggle={toggleTheme} />

  const isAppPage = page === 'home' || page === 'reservations' || page === 'settings'
  const visiblePage: Page = isAppPage && !session ? 'login' : page

  return <>
    {visiblePage === 'login' && <LoginPage dark={dark} onToggle={toggleTheme} onLogin={authenticate} onSignup={() => setPage('signup')} onForgotPassword={() => setPage('forgot-password')} />}
    {visiblePage === 'signup' && <SignupPage dark={dark} onToggle={toggleTheme} onBack={goToLogin} onComplete={completeSignup} />}
    {visiblePage === 'forgot-password' && <ForgotPasswordPage dark={dark} onToggle={toggleTheme} onBack={goToLogin} onSubmit={submitRecovery} />}
    {visiblePage === 'recovery-sent' && <RecoverySentPage dark={dark} onToggle={toggleTheme} email={recoveryEmail} onBack={goToLogin} />}
    {visiblePage === 'reset-password' && <ResetPasswordPage dark={dark} onToggle={toggleTheme} email={resetEmail} token={resetToken} onBack={goToLogin} onComplete={completeReset} />}
    {visiblePage === 'home' && session && <DashboardPage dark={dark} onToggle={toggleTheme} onNavigate={setPage} onLogout={endSession} user={session.user} reservations={reservations} reservationsLoading={reservationsLoading} onCreateReservations={createReservations} onPayment={openPayment} />}
    {visiblePage === 'reservations' && session && <ReservationsPage dark={dark} onToggle={toggleTheme} onNavigate={setPage} onLogout={endSession} user={session.user} reservations={reservations} loading={reservationsLoading} onCancel={cancelReservation} onUpdate={editReservation} onPayment={openPayment} />}
    {visiblePage === 'settings' && session && <SettingsPage dark={dark} onToggle={toggleTheme} onNavigate={setPage} onLogout={endSession} user={session.user} />}
    {toast && <div className="toast" role="status">{toast}</div>}
    {session && payment && <PixPaymentDialog key={payment.id} initialPayment={payment} onClose={() => { setPayment(null); void reloadReservations().catch(() => undefined) }} onChanged={reloadReservations} />}
  </>
}

export default App
