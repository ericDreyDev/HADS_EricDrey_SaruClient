import { useState } from 'react'
import type { AppPage } from '../../app/types'
import type { AuthUser } from '../auth/api/authApi'
import { AppLayout } from '../../shared/layout/AppLayout'
import { Icon } from '../../shared/ui/Icon'
import { EditReservationFlow } from './EditReservationFlow'
import { ReservationCard } from './ReservationCard'
import type { Reservation, ReservationDraft, ReservationStatus } from './model'

export function ReservationsPage({ dark, onToggle, onNavigate, onLogout, user, reservations, loading, onCancel, onUpdate, onPayment }: {
  dark: boolean
  onToggle: () => void
  onNavigate: (page: AppPage) => void
  onLogout: () => void
  user: AuthUser
  reservations: Reservation[]
  loading: boolean
  onCancel: (id: string) => Promise<void>
  onUpdate: (id: string, draft: ReservationDraft) => Promise<void>
  onPayment: (id: string) => Promise<void>
}) {
  const [filter, setFilter] = useState<'Todas' | ReservationStatus>('Todas')
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const filters: ('Todas' | ReservationStatus)[] = ['Todas', 'Aguardando pagamento', 'Em aberto', 'Consumida', 'Falta', 'Cancelada']
  const filtered = reservations
    .filter((reservation) => filter === 'Todas' || reservation.status === filter)
    .sort((a, b) => b.date.localeCompare(a.date))

  const cancel = async (reservation: Reservation) => {
    const warning = reservation.status === 'Aguardando pagamento'
      ? 'Todas as refeições vinculadas a este PIX pendente serão canceladas.'
      : reservation.paymentId ? 'O valor desta refeição será devolvido após o processamento do estorno.' : ''
    if (!window.confirm(`Cancelar a reserva de ${reservation.meal === 'lunch' ? 'almoço' : 'jantar'}? ${warning}`)) return
    setCancellingId(reservation.id)
    try {
      await onCancel(reservation.id)
    } finally {
      setCancellingId(null)
    }
  }

  return <AppLayout page="reservations" title="Minhas reservas" subtitle="Acompanhe refeições futuras e consulte seu histórico." dark={dark} onToggle={onToggle} onNavigate={onNavigate} onLogout={onLogout} user={user}>
    <section className="history-panel">
      <div className="history-heading"><div><p>Histórico</p><h2>Suas refeições</h2></div><span>{filtered.length} {filtered.length === 1 ? 'reserva' : 'reservas'}</span></div>
      <div className="filter-chips" aria-label="Filtrar reservas">{filters.map((item) => <button className={filter === item ? 'active' : ''} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {loading
        ? <div className="reservations-loading"><span className="loading-spinner" /><p>Carregando reservas…</p></div>
        : filtered.length
          ? <div className="reservation-list">{filtered.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onEdit={reservation.status === 'Em aberto' && !reservation.paymentId ? () => setEditing(reservation) : undefined} onCancel={['Em aberto', 'Aguardando pagamento'].includes(reservation.status) ? () => cancel(reservation) : undefined} onPayment={reservation.paymentId ? () => onPayment(reservation.paymentId!) : undefined} busy={cancellingId === reservation.id} />)}</div>
          : <div className="empty-state"><span><Icon name="calendar" /></span><h3>Nenhuma reserva encontrada</h3><p>Não há registros com o status selecionado.</p></div>}
    </section>
    {editing && <EditReservationFlow reservation={editing} user={user} onClose={() => setEditing(null)} onSave={(draft) => onUpdate(editing.id, draft)} />}
  </AppLayout>
}
