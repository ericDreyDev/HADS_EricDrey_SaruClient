import { useState } from 'react'
import { consumptionStatusLabels, formatCurrency, paymentStatusLabels } from '../reservations/model'
import { cancelManagedReservation, consumeReservation, listReservations, reservationStatusLabels } from './api'
import { ListFeedback, Pagination } from './ManagementControls'
import { message, queryFromForm, useManagementList } from './managementState'

export function ManagedReservations() {
  const [filters, setFilters] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const { data, loading, error, reload } = useManagementList(listReservations, `${filters}&page=${page}`)
  const act = async (id: string, consume: boolean) => {
    if (!consume && !window.confirm('Cancelar esta reserva? Se o PIX ainda estiver pendente, toda a seleção vinculada será cancelada. Valores pagos seguem o fluxo de reembolso.')) return
    setBusy(id); setFeedback('')
    try {
      await (consume ? consumeReservation(id) : cancelManagedReservation(id))
      setFeedback(consume ? 'Reserva marcada como consumida. O estado do pagamento foi mantido.' : 'Reserva cancelada. Eventuais reembolsos seguem o processamento de pagamentos.')
      reload()
    } catch (reason) { setFeedback(message(reason)) }
    finally { setBusy(null) }
  }
  return <section className="management-panel">
    <div className="management-heading"><div><h2>Reservas do restaurante</h2><p>Consulte as refeições e registre o consumo das reservas confirmadas para hoje.</p></div><button type="button" onClick={reload} disabled={loading}>Atualizar</button></div>
    <form className="management-filters" onSubmit={(event) => { event.preventDefault(); setFilters(queryFromForm(event.currentTarget)); setPage(1) }}>
      <label>Nome do usuário<input name="name" maxLength={200} placeholder="Buscar pelo nome" /></label>
      <label>Matrícula<input name="registration" maxLength={20} placeholder="Número da matrícula" /></label>
      <label>Data inicial<input type="date" name="from" /></label><label>Data final<input type="date" name="to" /></label>
      <label>Refeição<select name="mealType"><option value="">Todas</option><option value="Lunch">Almoço</option><option value="Dinner">Jantar</option></select></label>
      <label>Estado da reserva<select name="status"><option value="">Todos</option>{Object.entries(reservationStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="management-primary" type="submit">Filtrar reservas</button><button type="reset" onClick={() => { setFilters(''); setPage(1) }}>Limpar</button>
    </form>
    {feedback && <p className="management-notice" role="status">{feedback}</p>}
    <ListFeedback loading={loading} error={error} empty={!data.items.length} retry={reload} />
    {!loading && !error && data.items.length > 0 && <div className="management-table-wrap"><table><caption className="sr-only">Reservas do RU</caption><thead><tr><th>Usuário</th><th>Data e refeição</th><th>Reserva</th><th>Pagamento</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{data.items.map((r) => <tr key={r.id}>
      <td><strong>{r.fullName}</strong><small>Matrícula: {r.registration || '—'}</small></td>
      <td>{r.date.split('-').reverse().join('/')}<small>{r.mealType === 'Lunch' ? 'Almoço' : 'Jantar'}{r.includesJuice ? ' · Suco' : ''}{r.includesTakeoutContainer ? ' · Marmita' : ''}</small></td>
      <td><span className={`management-badge ${r.status === 'Consumed' ? 'is-success' : ''}`}>{reservationStatusLabels[r.status] ?? r.status}</span><small>{consumptionStatusLabels[r.consumptionStatus]}</small></td>
      <td>{paymentStatusLabels[r.paymentStatus]}<small>{r.paymentMethod === 'PayAtRestaurant' ? 'Pagar no RU' : r.paymentMethod === 'Pix' ? 'PIX' : '—'}</small></td>
      <td>{formatCurrency(r.totalPrice)}</td><td><div className="management-actions">{r.canConsume && <button className="management-primary" type="button" disabled={busy !== null} onClick={() => void act(r.id, true)}>{busy === r.id ? 'Salvando…' : 'Marcar consumida'}</button>}{r.canCancel && <button type="button" disabled={busy !== null} onClick={() => void act(r.id, false)}>Cancelar</button>}{!r.canConsume && !r.canCancel && '—'}</div></td>
    </tr>)}</tbody></table></div>}
    {!error && <Pagination data={data} onPage={setPage} loading={loading} />}
  </section>
}
