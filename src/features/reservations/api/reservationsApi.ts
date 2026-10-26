import { authenticatedRequest } from '../../auth/api/authApi'
import type { MealType, Reservation, ReservationDraft, ReservationStatus } from '../model'

type ApiMealType = 'Lunch' | 'Dinner'
type ApiReservationStatus = 'Confirmed' | 'AwaitingPayment' | 'Consumed' | 'NotConsumed' | 'Cancelled'

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
}

const statusLabels: Record<ApiReservationStatus, ReservationStatus> = {
  Confirmed: 'Em aberto',
  AwaitingPayment: 'Aguardando pagamento',
  Consumed: 'Consumida',
  NotConsumed: 'Falta',
  Cancelled: 'Cancelada',
}

function toReservation(response: ReservationResponse): Reservation {
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
  return reservations.map(toReservation)
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
