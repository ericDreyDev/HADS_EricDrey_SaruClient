import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../auth/api/authApi'
import type { AuthUser } from '../auth/api/authApi'
import { FormError } from '../../shared/ui/FormError'
import { Icon } from '../../shared/ui/Icon'
import { getReservationPricing } from './api/reservationsApi'
import { nextReservationDays, dateKey, formatCurrency, mealAvailability, mealLabel, reservationRules } from './model'
import type { DaySelection, MealType, PaymentMethod, Reservation, ReservationDraft, ReservationPricing } from './model'

export function ReservationFlow({ user, reservations, onClose, onConfirm }: {
  user: AuthUser
  reservations: Reservation[]
  onClose: () => void
  onConfirm: (reservations: ReservationDraft[], method: PaymentMethod) => Promise<void>
}) {
  const days = useMemo(() => nextReservationDays(), [])
  const [step, setStep] = useState<'customize' | 'review' | 'payment'>('customize')
  const [infoOpen, setInfoOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pricing, setPricing] = useState<ReservationPricing | null>(null)
  const [pricingError, setPricingError] = useState('')
  const [pricingAttempt, setPricingAttempt] = useState(0)
  const [method, setMethod] = useState<PaymentMethod>('Pix')
  const [selections, setSelections] = useState<Record<string, DaySelection>>(() => Object.fromEntries(days.map((day) => [dateKey(day), { lunch: false, dinner: false, juice: false, marmita: false }])))

  useEffect(() => {
    let active = true
    getReservationPricing().then((value) => { if (active) setPricing(value) }).catch((requestError) => {
      if (active) setPricingError(requestError instanceof ApiError ? requestError.message : 'Não foi possível consultar os valores do RU.')
    })
    return () => { active = false }
  }, [pricingAttempt])

  const isAlreadyReserved = (key: string, meal: MealType) => reservations.some((reservation) => reservation.date === key && reservation.meal === meal && reservation.status !== 'Cancelada')
  const isMealAvailable = (day: Date, meal: MealType) => mealAvailability(day, meal).available && !isAlreadyReserved(dateKey(day), meal)
  const availableDays = days.filter((day) => isMealAvailable(day, 'lunch') || isMealAvailable(day, 'dinner'))
  const entries = days.flatMap((day) => {
    const key = dateKey(day)
    const selection = selections[key]
    return (['lunch', 'dinner'] as MealType[]).filter((meal) => selection[meal]).map((meal) => ({
      date: day, key, meal, selection,
      price: pricing ? pricing.mealPrice + (selection.juice ? pricing.juicePrice : 0) + (selection.marmita ? pricing.takeoutContainerPrice : 0) : 0,
    }))
  })
  const total = entries.reduce((sum, entry) => sum + entry.price, 0)
  const changeSelection = (key: string, changes: Partial<DaySelection>) => setSelections((current) => ({ ...current, [key]: { ...current[key], ...changes } }))
  const toggleMeal = (key: string, meal: MealType) => changeSelection(key, { [meal]: !selections[key][meal] })
  const applyShortcut = (shortcut: 'lunch' | 'dinner' | 'all' | 'clear') => setSelections((current) => Object.fromEntries(days.map((day) => {
    const key = dateKey(day)
    if (shortcut === 'clear') return [key, { lunch: false, dinner: false, juice: false, marmita: false }]
    return [key, { ...current[key], lunch: isMealAvailable(day, 'lunch') && (shortcut === 'lunch' || shortcut === 'all'), dinner: isMealAvailable(day, 'dinner') && (shortcut === 'dinner' || shortcut === 'all') }]
  })))
  const confirm = async () => {
    if (!pricing || !entries.length || submitting) return
    const unavailable = entries.find((entry) => !isMealAvailable(entry.date, entry.meal))
    if (unavailable) { setError('O prazo de uma das refeições terminou. Volte e ajuste sua seleção.'); return }
    setSubmitting(true)
    setError('')
    try {
      await onConfirm(entries.map((entry) => ({ date: entry.key, meal: entry.meal, juice: entry.selection.juice, marmita: entry.selection.marmita })), method)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível concluir. Verifique suas reservas antes de tentar novamente.')
    } finally { setSubmitting(false) }
  }
  const close = () => { if (!submitting) onClose() }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <section className="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title">
      <header className="modal-header"><div><p>Nova reserva · {step === 'customize' ? '1 de 3' : step === 'review' ? '2 de 3' : '3 de 3'}</p><h2 id="reservation-modal-title">{step === 'customize' ? 'Escolha suas refeições' : step === 'review' ? 'Revise sua reserva' : 'Como você quer pagar?'}</h2></div><div className="modal-header__actions"><button className="icon-button" type="button" onClick={() => setInfoOpen(true)} aria-label="Ver regras e valores"><Icon name="info" /></button><button className="icon-button" type="button" disabled={submitting} onClick={close} aria-label="Fechar"><Icon name="close" /></button></div></header>
      {!pricing && <div className="checkout-notice" role="status">{pricingError || 'Consultando os valores do RU…'}{pricingError && <button className="edit-button" type="button" onClick={() => { setPricingError(''); setPricingAttempt((value) => value + 1) }}>Tentar novamente</button>}</div>}
      {step === 'customize' ? <>
        {availableDays.length > 0 && <section className="reservation-shortcuts" aria-label="Atalhos de reserva"><span>Atalhos</span><div><button type="button" onClick={() => applyShortcut('lunch')}>Só almoços</button><button type="button" onClick={() => applyShortcut('dinner')}>Só jantares</button><button type="button" onClick={() => applyShortcut('all')}>Semana completa</button>{entries.length > 0 && <button className="clear" type="button" onClick={() => applyShortcut('clear')}>Limpar</button>}</div></section>}
        {availableDays.length > 0 ? <div className="reservation-days">{availableDays.map((day) => {
          const key = dateKey(day)
          const selection = selections[key]
          const hasMeal = selection.lunch || selection.dinner
          return <article className={`reservation-day ${hasMeal ? 'selected' : ''}`} key={key}>
            <div className="reservation-day__heading"><span><b>{day.toLocaleDateString('pt-BR', { weekday: 'long' })}</b><small>{day.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</small></span>{hasMeal && <span className="selected-mark"><Icon name="check" /></span>}</div>
            <div className="meal-options">{(['lunch', 'dinner'] as MealType[]).map((meal) => {
              const availability = mealAvailability(day, meal)
              const alreadyReserved = isAlreadyReserved(key, meal)
              const available = availability.available && !alreadyReserved
              return <button className={selection[meal] ? 'selected' : ''} type="button" key={meal} disabled={!available} onClick={() => toggleMeal(key, meal)} aria-pressed={selection[meal]}><span>{mealLabel(meal)}</span>{!available && <small>{alreadyReserved ? 'Já reservada' : availability.reason}</small>}</button>
            })}</div>
            <div className="extra-options"><label className={!hasMeal ? 'disabled' : ''}><input type="checkbox" checked={selection.juice} disabled={!hasMeal} onChange={(event) => changeSelection(key, { juice: event.target.checked })} /><span>Suco {pricing && <small>+ {formatCurrency(pricing.juicePrice)}</small>}</span></label><label className={!hasMeal ? 'disabled' : ''}><input type="checkbox" checked={selection.marmita} disabled={!hasMeal} onChange={(event) => changeSelection(key, { marmita: event.target.checked })} /><span>Embalagem {pricing && <small>+ {formatCurrency(pricing.takeoutContainerPrice)}</small>}</span></label></div>
          </article>
        })}</div> : <div className="no-available-days"><span><Icon name="calendar" /></span><p>Não há horários disponíveis nesta semana.</p></div>}
        <footer className="modal-footer"><span><small>{entries.length} refeições selecionadas</small><strong>{pricing ? formatCurrency(total) : 'Consultando…'}</strong></span><button className="secondary-button" type="button" onClick={close}>Cancelar</button><button className="gradient-button" type="button" disabled={!entries.length || !pricing} onClick={() => setStep('review')}>Revisar reserva<Icon name="chevron" /></button></footer>
      </> : <>
        {step === 'review' ? <div className="review-list">{entries.map((entry) => <article key={`${entry.key}-${entry.meal}`}><span className="review-calendar"><Icon name="calendar" /></span><div><b>{entry.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</b><p>{mealLabel(entry.meal)}{entry.selection.juice ? ' · Suco' : ''}{entry.selection.marmita ? ' · Embalagem' : ''}</p></div><strong>{formatCurrency(entry.price)}</strong></article>)}</div> : <fieldset className="payment-methods"><legend>Forma de pagamento</legend>
          <label className={`payment-option ${method === 'Pix' ? 'selected' : ''}`}><input type="radio" name="payment-method" value="Pix" checked={method === 'Pix'} disabled={submitting} onChange={() => setMethod('Pix')} /><span><strong>PIX</strong><small>Pague agora com QR Code ou copia e cola. A reserva é confirmada após o recebimento.</small></span><span className="payment-option-tag">No aplicativo</span></label>
          <label className="payment-option unavailable"><input type="radio" name="payment-method" disabled /><span><strong>Cartão de crédito ou débito</strong><small>O pagamento com cartão pelo aplicativo estará disponível futuramente.</small></span><span className="payment-option-tag">Em breve</span></label>
          <label className={`payment-option ${method === 'PayAtRestaurant' ? 'selected' : ''}`}><input type="radio" name="payment-method" value="PayAtRestaurant" checked={method === 'PayAtRestaurant'} disabled={submitting} onChange={() => setMethod('PayAtRestaurant')} /><span><strong>Pagar no RU</strong><small>Confirme sua reserva agora e pague presencialmente. O pagamento ficará pendente.</small></span><span className="payment-option-tag">No restaurante</span></label>
        </fieldset>}
        <div className="review-total"><span>Valor total<small>{entries.length} {entries.length === 1 ? 'refeição' : 'refeições'} · com os adicionais selecionados</small></span><strong>{formatCurrency(total)}</strong></div>
        <div className="reservation-submit-error"><FormError message={error} /></div>
        <footer className="modal-footer modal-footer--review"><button className="secondary-button" type="button" disabled={submitting} onClick={() => { setError(''); setStep(step === 'payment' ? 'review' : 'customize') }}>Voltar</button><button className="gradient-button gradient-button--green" type="button" disabled={submitting || !pricing} onClick={() => step === 'review' ? setStep('payment') : void confirm()}>{submitting ? 'Processando…' : step === 'review' ? 'Confirmar e escolher pagamento' : method === 'Pix' ? 'Avançar para o PIX' : 'Confirmar e pagar no RU'}</button></footer>
      </>}
      {infoOpen && <div className="reservation-info-backdrop" role="presentation"><aside className="reservation-info" role="dialog" aria-modal="true" aria-labelledby="reservation-info-title"><header><h2 id="reservation-info-title">Regras e valores</h2><button className="icon-button" type="button" onClick={() => setInfoOpen(false)} aria-label="Fechar informações"><Icon name="close" /></button></header><div className="reservation-info__content"><section><h3>Atendimento</h3><p>Segunda a sexta-feira</p><ul><li>Almoço: 11h15 às 13h30 · reservas até {reservationRules.lunchCutoffHour}h</li><li>Jantar: 17h30 às 20h · reservas até {reservationRules.dinnerCutoffHour}h</li></ul></section>{pricing && <section><h3>Valores para {user.fullName}</h3><ul><li>Refeição: {formatCurrency(pricing.mealPrice)}</li><li>Suco: + {formatCurrency(pricing.juicePrice)}</li><li>Embalagem: + {formatCurrency(pricing.takeoutContainerPrice)}</li></ul></section>}<p className="document-note">Apresente a carteirinha estudantil ou o crachá de funcionário, quando aplicável.</p></div></aside></div>}
    </section>
  </div>
}
