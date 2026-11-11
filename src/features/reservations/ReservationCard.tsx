import cancelIcon from '../../assets/cancel-circle.svg'
import { formatCurrency, fromDateKey, mealLabel, paymentStatusLabels } from './model'
import type { Reservation } from './model'

export function ReservationCard({ reservation, onEdit, onCancel, onPayment, busy = false, highlighted = false }: { reservation: Reservation; onEdit?: () => void; onCancel?: () => void; onPayment?: () => void; busy?: boolean; highlighted?: boolean }) {
  const date = fromDateKey(reservation.date)
  const statusClass = ['Confirmada', 'Consumida'].includes(reservation.status) ? 'success' : reservation.status === 'Falta' || reservation.status === 'Cancelada' ? 'danger' : 'open'
  const paymentTone = reservation.paymentStatus === 'Paid' ? 'paid'
    : ['Refunded', 'Cancelled'].includes(reservation.paymentStatus) ? 'neutral'
      : ['Expired', 'Failed'].includes(reservation.paymentStatus) ? 'failed' : 'pending'
  const extras = [reservation.juice && 'Suco', reservation.marmita && 'Embalagem'].filter(Boolean)
  return <article id={`reservation-${reservation.id}`} className={`reservation-row ${highlighted ? 'reservation-row--highlighted' : ''}`}>
    <div className="reservation-main"><div className="date-card"><b>{String(date.getDate()).padStart(2, '0')}</b><small>{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small></div><div><h3>{mealLabel(reservation.meal)}</h3><p>{date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}{extras.length ? ` · ${extras.join(' + ')}` : ' · Sem adicionais'}</p></div></div>
    <div className="reservation-meta"><div className="reservation-statuses">
      <span className={`status status--${statusClass}`}>Reserva: {reservation.status}</span>
      <span className={`payment-status payment-status--${paymentTone}`}>Pagamento: {paymentStatusLabels[reservation.paymentStatus]}</span>
      <small>{reservation.paymentMethod === 'PayAtRestaurant' ? 'Pagar no RU' : reservation.paymentMethod === 'Pix' ? 'PIX' : 'Forma de pagamento não informada'}</small>
      <b>{formatCurrency(reservation.price)}</b>
    </div>
      {(onEdit || onCancel || onPayment) && <span className="reservation-actions">
        {onPayment && <button className="edit-button" type="button" disabled={busy} onClick={onPayment}>{reservation.status === 'Aguardando PIX' ? 'Continuar PIX' : 'Ver pagamento'}</button>}
        {onEdit && <button className="edit-button" type="button" disabled={busy} onClick={onEdit}>Editar</button>}
        {onCancel && <button className="ghost-button" type="button" disabled={busy} onClick={onCancel}><img src={cancelIcon} alt="" />{busy ? 'Cancelando…' : 'Cancelar'}</button>}
      </span>}
    </div>
  </article>
}
