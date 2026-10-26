import cancelIcon from '../../assets/cancel-circle.svg'
import { formatCurrency, fromDateKey, mealLabel } from './model'
import type { Reservation } from './model'

export function ReservationCard({ reservation, onEdit, onCancel, onPayment, busy = false }: { reservation: Reservation; onEdit?: () => void; onCancel?: () => void; onPayment?: () => void; busy?: boolean }) {
  const date = fromDateKey(reservation.date)
  const statusClass = reservation.status === 'Consumida' ? 'success' : reservation.status === 'Falta' || reservation.status === 'Cancelada' ? 'danger' : 'open'
  const extras = [reservation.juice && 'Suco', reservation.marmita && 'Marmita'].filter(Boolean)
  return <article className="reservation-row">
    <div className="reservation-main"><div className="date-card"><b>{String(date.getDate()).padStart(2, '0')}</b><small>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small></div><div><h3>{mealLabel(reservation.meal)}</h3><p>{date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}{extras.length ? ` · ${extras.join(' + ')}` : ' · Sem adicionais'}</p></div></div>
    <div className="reservation-meta"><div><span className={`status status--${statusClass}`}>{reservation.status}</span><b>{formatCurrency(reservation.price)}</b></div>
      {(onEdit || onCancel || onPayment) && <span className="reservation-actions">
        {onPayment && <button className="edit-button" type="button" disabled={busy} onClick={onPayment}>{reservation.status === 'Aguardando pagamento' ? 'Ver PIX' : 'Pagamento'}</button>}
        {onEdit && <button className="edit-button" type="button" disabled={busy} onClick={onEdit}>Editar</button>}
        {onCancel && <button className="ghost-button" type="button" disabled={busy} onClick={onCancel}><img src={cancelIcon} alt="" />{busy ? 'Cancelando…' : 'Cancelar'}</button>}
      </span>}
    </div>
  </article>
}
