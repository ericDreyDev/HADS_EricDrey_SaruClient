import { authenticatedRequest } from '../../auth/api/authApi'
import type { ReservationDraft } from '../model'

export type PixPayment = {
  id: string
  amount: number
  status: 'Creating' | 'Pending' | 'Received' | 'Cancelled' | 'Expired' | 'PartiallyRefunded' | 'Refunded' | 'ReviewRequired'
  expiresAt: string
  paidAt: string | null
  encodedImage: string | null
  payload: string | null
  message: string | null
  reservations: { id: string; amount: number }[]
  refunds: { reservationId: string; amount: number; status: 'Pending' | 'Submitting' | 'Submitted' | 'Done' | 'ReviewRequired'; receiptUrl: string | null }[]
}

export function createPixPayment(checkoutId: string, drafts: ReservationDraft[]) {
  return authenticatedRequest<PixPayment>('/payments/pix', {
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
