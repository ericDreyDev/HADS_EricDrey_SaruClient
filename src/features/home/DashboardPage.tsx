import { useState } from 'react'
import calendarAddIcon from '../../assets/calendar-add.svg'
import type { AppPage } from '../../app/types'
import type { AuthUser } from '../auth/api/authApi'
import { WeeklyMenu } from '../menu/WeeklyMenu'
import { ReservationCard } from '../reservations/ReservationCard'
import { ReservationFlow } from '../reservations/ReservationFlow'
import type { Reservation, ReservationDraft } from '../reservations/model'
import { AppLayout } from '../../shared/layout/AppLayout'
import { Icon } from '../../shared/ui/Icon'

export function DashboardPage({ dark, onToggle, onNavigate, onLogout, user, reservations, reservationsLoading, onCreateReservations, onPayment }: { dark: boolean; onToggle: () => void; onNavigate: (page: AppPage) => void; onLogout: () => void; user: AuthUser; reservations: Reservation[]; reservationsLoading: boolean; onCreateReservations: (reservations: ReservationDraft[]) => Promise<void>; onPayment: (id: string) => Promise<void> }) {
  const [reservationOpen, setReservationOpen] = useState(false)
  const firstName = user.fullName.split(/\s+/).filter(Boolean)[0] || 'usuário'
  const upcoming = reservations.filter((reservation) => ['Em aberto', 'Aguardando pagamento'].includes(reservation.status)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const confirm = async (newReservations: ReservationDraft[]) => { await onCreateReservations(newReservations); setReservationOpen(false) }
  return <AppLayout page="home" title={`Olá, ${firstName}.`} subtitle="" dark={dark} onToggle={onToggle} onNavigate={onNavigate} onLogout={onLogout} user={user}>
    <section className="home-grid"><WeeklyMenu /></section>
    <button className="home-reserve-button" type="button" onClick={() => setReservationOpen(true)}><img src={calendarAddIcon} alt="" />Realizar reserva</button>
    <section className="reservations-panel compact-reservations"><div className="panel-header"><div><p>Próximas refeições</p><h2>Reservas em aberto</h2></div><button className="text-action" type="button" onClick={() => onNavigate('reservations')}>Ver todas <Icon name="chevron" /></button></div>{reservationsLoading ? <div className="reservations-loading"><span className="loading-spinner" /><p>Carregando reservas…</p></div> : upcoming.length ? <div className="reservation-list">{upcoming.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onPayment={reservation.paymentId ? () => onPayment(reservation.paymentId!) : undefined} />)}</div> : <div className="empty-state"><span><Icon name="calendar" /></span><h3>Nenhuma reserva em aberto</h3><p>Quando você reservar uma refeição, ela aparecerá aqui.</p><button className="gradient-button" type="button" onClick={() => setReservationOpen(true)}>Fazer uma reserva</button></div>}</section>
    {reservationOpen && <ReservationFlow user={user} reservations={reservations} onClose={() => setReservationOpen(false)} onConfirm={confirm} />}
  </AppLayout>
}
