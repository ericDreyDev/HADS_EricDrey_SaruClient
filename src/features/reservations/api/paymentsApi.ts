import { authenticatedRequest } from '../../auth/api/authApi'
import type { PaymentMethod, ReservationDraft, ReservationPaymentStatus } from '../model'

export type PixPayment = {
  id: string
  amount: number
  status: 'Creating' | 'Pending' | 'Received' | 'Cancelled' | 'Expired' | 'PartiallyRefunded' | 'Refunded' | 'ReviewRequired' | 'Failed'
  method: PaymentMethod
  expiresAt: string
  paidAt: string | null
  encodedImage: string | null
  payload: string | null
  message: string | null
  reservations: { id: string; amount: number; status: 'AwaitingPayment' | 'Confirmed' | 'Cancelled' | 'Consumed' | 'NotConsumed' | 'PaymentExpired' | 'PaymentFailed'; paymentStatus: ReservationPaymentStatus }[]
  refunds: { reservationId: string; amount: number; status: 'Pending' | 'Submitting' | 'Submitted' | 'Done' | 'ReviewRequired'; receiptUrl: string | null }[]
}

export function createReservationPayment(checkoutId: string, drafts: ReservationDraft[], method: PaymentMethod) {
  return authenticatedRequest<PixPayment>(method === 'Pix' ? '/payments/pix' : '/payments/restaurant', {
    method: 'POST',
    body: JSON.stringify({ checkoutId, reservations: drafts.map((draft) => ({
      date: draft.date,
      mealType: draft.meal === 'lunch' ? 'Lunch' : 'Dinner',
      includesJuice: draft.juice,
      includesTakeoutContainer: draft.marmita,
    })) }),
  })
}

export function getPixPayment(id: string) {
  return authenticatedRequest<PixPayment>(`/payments/${id}`)
}

export function cancelPixPayment(id: string) {
  return authenticatedRequest<PixPayment>(`/payments/${id}/cancel`, { method: 'POST' })
}
