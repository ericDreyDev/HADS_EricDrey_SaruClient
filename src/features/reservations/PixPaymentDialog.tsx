import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../auth/api/authApi'
import { FormError } from '../../shared/ui/FormError'
import { Icon } from '../../shared/ui/Icon'
import { cancelPixPayment, getPixPayment } from './api/paymentsApi'
import type { PixPayment } from './api/paymentsApi'
import { formatCurrency } from './model'
import { paymentFeedback, pixCheckoutSucceeded } from './paymentState'

export function PixPaymentDialog({ initialPayment, onClose, onChanged, onSuccess }: {
  initialPayment: PixPayment
  onClose: () => void
  onChanged: () => Promise<void>
  onSuccess?: (payment: PixPayment) => Promise<void>
}) {
  const [payment, setPayment] = useState(initialPayment)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const dialog = useRef<HTMLElement>(null)
  const successHandled = useRef(false)
  const isPix = payment.method === 'Pix'
  const expired = isPix && now >= new Date(payment.expiresAt).getTime()
  const paid = payment.paidAt !== null
  const terminal = ['Cancelled', 'Expired', 'Refunded', 'Failed'].includes(payment.status)
  const canPay = isPix && !paid && payment.status === 'Pending' && !expired && Boolean(payment.payload)
  const successful = pixCheckoutSucceeded(payment)
  const remaining = Math.max(0, Math.ceil((new Date(payment.expiresAt).getTime() - now) / 1000))
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
  const feedback = !isPix && payment.status === 'Pending'
    ? { tone: 'warning', title: 'Pagamento no RU', message: 'Sua reserva está confirmada. O pagamento está pendente e deve ser feito presencialmente no restaurante.' }
    : paymentFeedback(payment, expired)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [])

  useEffect(() => {
    let active = true
    let timer: number | undefined
    let lastState = JSON.stringify(initialPayment)
    const poll = async () => {
      try {
        const result = await getPixPayment(initialPayment.id)
        if (!active) return
        setPayment(result)
        setError('')
        const state = JSON.stringify(result)
        if (state !== lastState) {
          lastState = state
          try { await onChanged() } catch { /* Payment confirmation is authoritative even if refreshing the list fails. */ }
        }
        if (result.method !== 'Pix' || ['Cancelled', 'Expired', 'Refunded', 'Failed'].includes(result.status)
          || result.paidAt && result.status !== 'ReviewRequired' && result.refunds.every((refund) => refund.status === 'Done')) return
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof ApiError && [401, 403].includes(requestError.status)
          ? 'Sua sessão terminou. Entre novamente para consultar o resultado deste pagamento.'
          : 'Não foi possível atualizar o pagamento. Não pague novamente; tentaremos conferir o resultado.')
        if (requestError instanceof ApiError && [401, 403, 404].includes(requestError.status)) return
      }
      if (active) timer = window.setTimeout(poll, 2000)
    }
    void poll()
    const ticker = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { active = false; window.clearTimeout(timer); window.clearInterval(ticker) }
  }, [initialPayment, onChanged])

  useEffect(() => {
    if (!successful || !onSuccess || successHandled.current) return
    const timer = window.setTimeout(() => {
      successHandled.current = true
      void onSuccess(payment)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [successful, onSuccess, payment])

  const copy = async () => {
    if (!canPay || !payment.payload) return
    try { await navigator.clipboard.writeText(payment.payload); setCopied(true) }
    catch { setError('Não foi possível copiar. Selecione e copie o código abaixo.') }
  }
  const cancel = async () => {
    if (!window.confirm('Cancelar este PIX e todas as refeições desta tentativa?')) return
    setCancelling(true)
    setError('')
    try {
      setPayment(await cancelPixPayment(payment.id))
      await onChanged().catch(() => undefined)
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível cancelar. Acompanhe o resultado antes de tentar novamente.')
    } finally { setCancelling(false) }
  }

  return <div className="modal-backdrop" role="presentation"><section ref={dialog} className="reservation-modal pix-modal" role="dialog" aria-modal="true" aria-labelledby="pix-title" onKeyDown={(event) => {
    if (event.key === 'Escape' && !cancelling) { event.stopPropagation(); onClose(); return }
    if (event.key !== 'Tab') return
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, a[href]')
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}>
    <header className="modal-header"><div><p>Pagamento das reservas</p><h2 id="pix-title">{feedback.title}</h2></div><button className="icon-button" type="button" disabled={cancelling} onClick={onClose} aria-label="Fechar pagamento"><Icon name="close" /></button></header>
    <div className="pix-content">
      <div className={`checkout-feedback checkout-feedback--${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'} aria-live="polite"><strong>{successful ? 'Reserva confirmada · Pagamento pago' : feedback.tone === 'error' ? 'Reserva não concluída' : feedback.title}</strong><p>{feedback.message}</p>{successful && onSuccess && <p>Abrindo sua reserva…</p>}</div>
      <div className="pix-total"><span>{payment.reservations.length} {payment.reservations.length === 1 ? 'refeição' : 'refeições'} · {isPix ? 'PIX' : 'Pagar no RU'}</span><strong>{formatCurrency(payment.amount)}</strong></div>
      {canPay && <>
        {payment.encodedImage && <img className="pix-qr" src={`data:image/png;base64,${payment.encodedImage}`} alt="QR Code para pagamento das reservas via PIX" />}
        <p className="pix-deadline">Tempo para pagar <strong>{countdown}</strong></p>
        <label className="pix-code">PIX copia e cola<textarea readOnly value={payment.payload ?? ''} onFocus={(event) => event.target.select()} /></label>
        <button className="gradient-button" type="button" onClick={copy}>{copied ? 'Código copiado!' : 'Copiar código PIX'}</button>
        <p className="pix-hint">Mantenha esta janela aberta para receber a confirmação. Você também pode acompanhar o PIX em Minhas reservas.</p>
      </>}
      {isPix && !paid && !terminal && !expired && !canPay && <div className="pix-preparing" role="status"><span className="loading-spinner" /><p>Aguardando o código de pagamento…</p></div>}
      {payment.refunds.map((refund) => <div className={`pix-refund ${refund.status === 'Done' ? 'pix-refund--done' : ''}`} key={refund.reservationId}><span>{formatCurrency(refund.amount)} — {refund.status === 'Done' ? 'Reembolsado' : refund.status === 'ReviewRequired' ? 'Reembolso em conferência pelo RU' : 'Reembolso em andamento'}</span>{refund.receiptUrl && <a href={refund.receiptUrl} target="_blank" rel="noreferrer">Ver comprovante</a>}</div>)}
      <FormError message={error} />
    </div>
    <footer className="modal-footer pix-footer">
      {isPix && !paid && !terminal && !expired && <button className="ghost-button" type="button" disabled={cancelling} onClick={cancel}>{cancelling ? 'Cancelando…' : 'Cancelar PIX'}</button>}
      <button className="secondary-button" type="button" disabled={cancelling} onClick={() => successful && onSuccess ? void onSuccess(payment) : onClose()}>{successful ? 'Ver minha reserva' : terminal || expired ? 'Voltar às reservas' : 'Acompanhar nas reservas'}</button>
    </footer>
  </section></div>
}
