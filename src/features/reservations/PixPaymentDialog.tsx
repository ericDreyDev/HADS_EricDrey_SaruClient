import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../auth/api/authApi'
import { FormError } from '../../shared/ui/FormError'
import { Icon } from '../../shared/ui/Icon'
import { getPixPayment } from './api/paymentsApi'
import type { PixPayment } from './api/paymentsApi'
import { formatCurrency } from './model'

export function PixPaymentDialog({ initialPayment, onClose, onChanged }: {
  initialPayment: PixPayment
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const [payment, setPayment] = useState(initialPayment)
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const dialog = useRef<HTMLElement>(null)
  const expired = now >= new Date(payment.expiresAt).getTime()
  const paid = payment.paidAt !== null
  const terminal = ['Cancelled', 'Expired', 'Refunded'].includes(payment.status)
  const canPay = payment.status === 'Pending' && !expired && Boolean(payment.payload)
  const refunding = payment.refunds.some((refund) => refund.status !== 'Done')
  const remaining = Math.max(0, Math.ceil((new Date(payment.expiresAt).getTime() - now) / 1000))
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`

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
          await onChanged()
        }
        if (['Cancelled', 'Expired', 'Refunded'].includes(result.status)
          || result.paidAt && result.refunds.every((refund) => refund.status === 'Done')) return
      } catch (requestError) {
        if (!active) return
        setError(requestError instanceof ApiError ? requestError.message : 'Não foi possível atualizar o pagamento. Tentaremos novamente.')
        if (requestError instanceof ApiError && [401, 403, 404].includes(requestError.status)) return
      }
      if (active) timer = window.setTimeout(poll, 3000)
    }
    void poll()
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => { active = false; window.clearTimeout(timer); window.clearInterval(clock) }
  }, [initialPayment, onChanged])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(payment.payload ?? '')
      setCopied(true)
    } catch { setError('Não foi possível copiar. Selecione e copie o código abaixo.') }
  }

  const title = payment.status === 'Refunded' ? 'Pagamento devolvido'
    : paid && refunding ? 'Devolução em andamento'
      : paid ? 'Pagamento recebido'
        : payment.status === 'ReviewRequired' ? 'Conferindo pagamento'
          : payment.status === 'Cancelled' ? 'Seleção cancelada'
            : terminal || expired ? 'Prazo de pagamento encerrado' : 'Pague com PIX'

  return <div className="modal-backdrop" role="presentation"><section ref={dialog} className="reservation-modal pix-modal" role="dialog" aria-modal="true" aria-labelledby="pix-title" onKeyDown={(event) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
    if (event.key !== 'Tab') return
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea, a[href]')
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}>
    <header className="modal-header"><div><p>Pagamento das reservas</p><h2 id="pix-title">{title}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar pagamento"><Icon name="close" /></button></header>
    <div className="pix-content">
      <div className="pix-total"><span>{payment.reservations.length} {payment.reservations.length === 1 ? 'refeição' : 'refeições'}</span><strong>{formatCurrency(payment.amount)}</strong></div>
      <div role="status" aria-live="polite">
        {payment.status === 'Refunded' ? <p>O valor foi devolvido. Consulte os comprovantes abaixo.</p>
          : paid ? <p>{refunding ? 'A reserva foi cancelada. Acompanhe a devolução abaixo.' : payment.refunds.length ? 'Os estornos solicitados foram concluídos.' : 'Suas reservas foram confirmadas. Você já pode consultá-las no RU.'}</p>
            : payment.status === 'ReviewRequired' ? <p>Estamos conferindo o resultado com o Asaas. Acompanhe este pagamento em Minhas reservas.</p>
              : terminal || expired ? <p>{payment.status === 'Cancelled' ? 'Esta seleção foi cancelada.' : 'Não efetue o pagamento deste PIX. As reservas sem pagamento serão canceladas.'} Se você já pagou, aguarde a conferência; pagamentos fora do prazo serão devolvidos.</p>
                : canPay ? <p>Escaneie o QR Code ou use o código copia e cola no aplicativo do seu banco.</p>
                  : <p>Estamos preparando seu PIX. Aguarde alguns instantes…</p>}
      </div>
      {canPay && <>
        {payment.encodedImage && <img className="pix-qr" src={`data:image/png;base64,${payment.encodedImage}`} alt="QR Code para pagamento das reservas via PIX" />}
        <p className="pix-deadline">Pague em até <strong>{countdown}</strong></p>
        <label className="pix-code">PIX copia e cola<textarea readOnly value={payment.payload ?? ''} onFocus={(event) => event.target.select()} /></label>
        <button className="gradient-button" type="button" onClick={copy}>{copied ? 'Código copiado' : 'Copiar código PIX'}</button>
        <p className="pix-hint">A confirmação é automática após o recebimento. Fechar esta janela não cancela o PIX.</p>
      </>}
      {payment.refunds.map((refund) => <div className="pix-refund" key={refund.reservationId}><span>{formatCurrency(refund.amount)} — {refund.status === 'Done' ? 'Devolvido' : refund.status === 'ReviewRequired' ? 'Em conferência pelo RU' : 'Aguardando devolução'}</span>{refund.receiptUrl && <a href={refund.receiptUrl} target="_blank" rel="noreferrer">Comprovante</a>}</div>)}
      {payment.message && <p className="pix-hint">{payment.message}</p>}
      <FormError message={error} />
    </div>
    <footer className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>{paid || terminal ? 'Concluir' : 'Acompanhar em Minhas reservas'}</button></footer>
  </section></div>
}
