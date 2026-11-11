import type { PixPayment } from './api/paymentsApi'

export function pixCheckoutSucceeded(payment: PixPayment) {
  return payment.method === 'Pix' && payment.status === 'Received' && payment.paidAt !== null
    && payment.refunds.length === 0 && payment.reservations.length > 0
    && payment.reservations.every((item) => item.status === 'Confirmed' && item.paymentStatus === 'Paid')
}

export function paymentFeedback(payment: PixPayment, expired: boolean) {
  if (payment.status === 'Refunded')
    return { tone: 'info', title: 'Pagamento reembolsado', message: 'O valor foi devolvido. Consulte os comprovantes abaixo.' }
  if (payment.refunds.some((refund) => refund.status !== 'Done'))
    return { tone: 'warning', title: 'Reembolso em andamento', message: 'A refeição cancelada não está mais reservada. O valor será devolvido; acompanhe a situação abaixo.' }
  if (payment.paidAt === null && (payment.status === 'Expired' || expired && !['Failed', 'Cancelled'].includes(payment.status)))
    return { tone: 'error', title: 'O prazo do PIX terminou', message: 'Nenhuma reserva foi confirmada. Não pague este código. Se você já pagou, aguarde a conferência e a devolução do valor.' }
  if (payment.status === 'ReviewRequired')
    return { tone: 'warning', title: 'Pagamento em conferência', message: 'Ainda não foi possível confirmar sua reserva. Estamos conferindo o resultado do pagamento. Não faça outro PIX para esta tentativa.' }
  if (pixCheckoutSucceeded(payment))
    return { tone: 'success', title: 'Reserva confirmada!', message: 'PIX recebido. Sua reserva está confirmada e o pagamento está pago.' }
  if (payment.paidAt !== null)
    return { tone: 'info', title: 'Pagamento recebido', message: payment.refunds.length ? 'Consulte abaixo os reembolsos deste pagamento.' : 'Consulte a situação de cada refeição em Minhas reservas.' }
  if (payment.status === 'Failed')
    return { tone: 'error', title: 'Não foi possível concluir o PIX', message: 'Nenhuma reserva foi confirmada. Tente fazer uma nova reserva. Se já pagou, o RU fará a conferência e a devolução do valor.' }
  if (payment.status === 'Cancelled')
    return { tone: 'error', title: 'Pagamento cancelado', message: 'Nenhuma refeição desta tentativa foi confirmada. Se um pagamento for identificado, o valor será devolvido.' }
  return { tone: 'info', title: payment.payload ? 'Pague com PIX' : 'Preparando seu PIX', message: payment.payload ? 'Escaneie o QR Code ou use o código copia e cola no aplicativo do seu banco.' : 'Estamos gerando o código. Sua reserva será confirmada após o recebimento.' }
}
