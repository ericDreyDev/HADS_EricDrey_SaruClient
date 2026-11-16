import { API_URL, authenticatedRequest } from '../auth/api/authApi'
import type { RegisterUserInput } from '../auth/api/authApi'
import type { PaymentMethod, ReservationConsumptionStatus, ReservationPaymentStatus } from '../reservations/model'

export type UserRole = RegisterUserInput['role'] | 'Administrator'
export type ManagedUser = Omit<RegisterUserInput, 'password' | 'role'> & { id: number; role: UserRole; active: boolean }
export type UserInput = Omit<ManagedUser, 'id'> & { password?: string }
export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number }
export type ManagedReservation = {
  id: string; userId: number; fullName: string; registration: string | null; date: string
  mealType: 'Lunch' | 'Dinner'; status: string; consumptionStatus: ReservationConsumptionStatus
  paymentStatus: ReservationPaymentStatus; paymentMethod: PaymentMethod | null; totalPrice: number
  includesJuice: boolean; includesTakeoutContainer: boolean; canConsume: boolean; canCancel: boolean
}
export type WeeklyMenuData = { id: string; weekStart: string; weekEnd: string; imageUrl: string; updatedAt: string }

export const roleLabels: Record<UserRole, string> = { Student: 'Estudante', Professor: 'Professor', Employee: 'Funcionário', Visitor: 'Visitante', Administrator: 'Administrador' }
export const reservationStatusLabels: Record<string, string> = { Confirmed: 'Confirmada', AwaitingPayment: 'Aguardando PIX', Consumed: 'Consumida', NotConsumed: 'Não consumida', Cancelled: 'Cancelada', PaymentExpired: 'PIX expirado', PaymentFailed: 'Pagamento falhou' }
export const menuImageUrl = (menu: WeeklyMenuData) => `${API_URL}${menu.imageUrl}`
export const listUsers = (query: string) => authenticatedRequest<Paged<ManagedUser>>(`/management/users?${query}`)
export const listReservations = (query: string) => authenticatedRequest<Paged<ManagedReservation>>(`/management/reservations?${query}`)
export const saveUser = (input: UserInput, id?: number) => authenticatedRequest(`/management/users${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) })
export const deactivateUser = (id: number) => authenticatedRequest<void>(`/management/users/${id}`, { method: 'DELETE' })
export const consumeReservation = (id: string) => authenticatedRequest<void>(`/management/reservations/${id}/consume`, { method: 'POST' })
export const cancelManagedReservation = (id: string) => authenticatedRequest<void>(`/management/reservations/${id}`, { method: 'DELETE' })
export const listMenus = (page: number) => authenticatedRequest<Paged<WeeklyMenuData>>(`/management/menus?page=${page}`)
export const currentMenu = () => authenticatedRequest<WeeklyMenuData>('/menus/current')
export const deleteMenu = (id: string) => authenticatedRequest<void>(`/management/menus/${id}`, { method: 'DELETE' })
export function saveMenu(week: string, image: Blob) {
  const body = new FormData()
  body.append('image', image, `cardapio-${week}.png`)
  return authenticatedRequest<WeeklyMenuData>(`/management/menus/${week}`, { method: 'PUT', body })
}
