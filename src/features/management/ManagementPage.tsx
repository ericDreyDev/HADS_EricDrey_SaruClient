import { useState } from 'react'
import type { AppPage } from '../../app/types'
import type { AuthUser } from '../auth/api/authApi'
import { AppLayout } from '../../shared/layout/AppLayout'
import { ManagedReservations } from './ManagedReservations'
import { ManagedUsers } from './ManagedUsers'
import { ManagedMenus } from './ManagedMenus'

export function ManagementPage(props: { dark: boolean; onToggle: () => void; onNavigate: (page: AppPage) => void; onLogout: () => void; user: AuthUser }) {
  const [tab, setTab] = useState<'reservations' | 'menus' | 'users'>('reservations')
  return <AppLayout {...props} page="management" title="Gestão do RU" subtitle="Organize o atendimento, publique cardápios e gerencie os usuários do restaurante.">
    <section className="management">
      <nav className="management-tabs" aria-label="Áreas da gestão">
        {([['reservations', 'Reservas'], ['menus', 'Cardápios'], ['users', 'Usuários']] as const).map(([value, label]) => <button type="button" key={value} aria-current={tab === value ? 'page' : undefined} onClick={() => setTab(value)}>{label}</button>)}
      </nav>
      {tab === 'reservations' && <ManagedReservations />}
      {tab === 'menus' && <ManagedMenus />}
      {tab === 'users' && <ManagedUsers actorId={Number(props.user.id)} />}
    </section>
  </AppLayout>
}
