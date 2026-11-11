import type { AuthUser } from '../auth/api/authApi'

export type MealType = 'lunch' | 'dinner'
export type ReservationStatus = 'Confirmada' | 'Aguardando PIX' | 'Consumida' | 'Falta' | 'Cancelada'
export type PaymentMethod = 'Pix' | 'PayAtRestaurant'
export type ReservationPaymentStatus = 'Pending' | 'Paid' | 'RefundPending' | 'Refunded' | 'Cancelled' | 'Expired' | 'Failed' | 'ReviewRequired'

export type Reservation = {
  id: string
  date: string
  meal: MealType
  juice: boolean
  marmita: boolean
  status: ReservationStatus
  price: number
  deadline: string
  paymentId?: string | null
  canEdit: boolean
  canCancel: boolean
  paymentStatus: ReservationPaymentStatus
  paymentMethod: PaymentMethod | null
}

export type ReservationDraft = Pick<Reservation, 'date' | 'meal' | 'juice' | 'marmita'>

export type ReservationPricing = { mealPrice: number; juicePrice: number; takeoutContainerPrice: number }

export type DaySelection = {
  lunch: boolean
  dinner: boolean
  juice: boolean
  marmita: boolean
}

export const reservationRules = {
  lunchCutoffHour: 10,
  dinnerCutoffHour: 16,
  mealPrices: {
    Student: 10,
    Employee: 15,
    Professor: 20,
    Visitor: 20,
    Administrator: 20,
  } as Record<string, number>,
  juicePrice: 3,
  marmitaPrice: 2.5,
} as const

export function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function nextReservationDays(now = new Date()) {
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dinnerDeadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), reservationRules.dinnerCutoffHour)
  if (now > dinnerDeadline) cursor = addDays(cursor, 1)

  const days: Date[] = []
  while (days.length < 5) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function mealLabel(meal: MealType) { return meal === 'lunch' ? 'Almoço' : 'Jantar' }

export function mealAvailability(date: Date, meal: MealType, now = new Date()) {
  if (date.getDay() === 0 || date.getDay() === 6) return { available: false, reason: 'Fim de semana' }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (target < today) return { available: false, reason: 'Dia encerrado' }
  if (target > today) return { available: true, reason: 'Disponível' }
  const cutoff = meal === 'lunch' ? reservationRules.lunchCutoffHour : reservationRules.dinnerCutoffHour
  const deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cutoff)
  const available = now <= deadline
  return { available, reason: available ? `Até ${cutoff}h` : `Prazo de ${cutoff}h encerrado` }
}

export function mealPriceFor(user: AuthUser) {
  if (user.roles.includes('Student')) return reservationRules.mealPrices.Student
  if (user.roles.includes('Employee')) return reservationRules.mealPrices.Employee
  return 20
}

export const paymentStatusLabels: Record<ReservationPaymentStatus, string> = {
  Pending: 'Pendente',
  Paid: 'Pago',
  RefundPending: 'Reembolso em andamento',
  Refunded: 'Reembolsado',
  Cancelled: 'Cancelado',
  Expired: 'PIX expirado',
  Failed: 'Falha no pagamento',
  ReviewRequired: 'Em conferência',
}
