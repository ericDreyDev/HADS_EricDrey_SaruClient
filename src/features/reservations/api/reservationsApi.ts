import { authenticatedRequest } from '../../auth/api/authApi'
import type { MealType, PaymentMethod, Reservation, ReservationDraft, ReservationStatus, ReservationPaymentStatus, ReservationPricing } from '../model'

type ApiMealType = 'Lunch' | 'Dinner'
type ApiReservationStatus = 'Confirmed' | 'AwaitingPayment' | 'Consumed' | 'NotConsumed' | 'Cancelled' | 'PaymentExpired' | 'PaymentFailed'

type ReservationResponse = {
  id: string
  date: string
  mealType: ApiMealType
  reservationDeadline: string
  includesJuice: boolean
  includesTakeoutContainer: boolean
  totalPrice: number
  status: ApiReservationStatus
  paymentId: string | null
  canEdit?: boolean
  canCancel?: boolean
  paymentStatus?: ReservationPaymentStatus
  paymentMethod?: PaymentMethod | null
}

const statusLabels: Record<ApiReservationStatus, ReservationStatus> = {
  Confirmed: 'Confirmada',
  AwaitingPayment: 'Aguardando PIX',
  Consumed: 'Consumida',
  NotConsumed: 'Falta',
  Cancelled: 'Cancelada',
  PaymentExpired: 'Cancelada',
  PaymentFailed: 'Cancelada',
}

function toReservation(response: ReservationResponse): Reservation {
  const canChangeConfirmed = response.status === 'Confirmed' && Date.now() <= Date.parse(response.reservationDeadline)
  return {
    id: response.id,
    date: response.date,
    meal: response.mealType === 'Lunch' ? 'lunch' : 'dinner',
    juice: response.includesJuice,
    marmita: response.includesTakeoutContainer,
    status: statusLabels[response.status],
    price: response.totalPrice,
    deadline: response.reservationDeadline,
    paymentId: response.paymentId,
    canEdit: response.canEdit ?? (canChangeConfirmed && !response.paymentId),
    canCancel: response.canCancel ?? (canChangeConfirmed || response.status === 'AwaitingPayment'),
    paymentStatus: response.paymentStatus ?? (response.status === 'Cancelled' ? 'Cancelled' : 'Pending'),
    paymentMethod: response.paymentMethod ?? null,
  }
}

function toRequest(input: ReservationDraft) {
  const mealTypes: Record<MealType, ApiMealType> = {
    lunch: 'Lunch',
    dinner: 'Dinner',
  }

  return {
    date: input.date,
    mealType: mealTypes[input.meal],
    includesJuice: input.juice,
    includesTakeoutContainer: input.marmita,
  }
}

export async function getReservations(includeCancelled = true) {
  const reservations = await authenticatedRequest<ReservationResponse[]>(
    `/reservations?includeCancelled=${includeCancelled}`,
  )
  return reservations.filter((reservation) => !['PaymentExpired', 'PaymentFailed'].includes(reservation.status)).map(toReservation)
}

export function getReservationPricing() {
  return authenticatedRequest<ReservationPricing>('/reservations/pricing')
}

export async function createReservation(input: ReservationDraft) {
  const reservation = await authenticatedRequest<ReservationResponse>('/reservations', {
    method: 'POST',
    body: JSON.stringify(toRequest(input)),
  })
  return toReservation(reservation)
}

export async function updateReservation(id: string, input: ReservationDraft) {
  const reservation = await authenticatedRequest<ReservationResponse>(`/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toRequest(input)),
  })
  return toReservation(reservation)
}

export function cancelReservation(id: string) {
  return authenticatedRequest<void>(`/reservations/${id}`, { method: 'DELETE' })
}
