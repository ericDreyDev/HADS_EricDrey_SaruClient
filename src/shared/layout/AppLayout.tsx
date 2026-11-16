import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import clockIcon from '../../assets/clock.svg'
import homeIcon from '../../assets/home.svg'
import shieldIcon from '../../assets/shield.svg'
import type { AppPage } from '../../app/types'
import type { AuthUser } from '../../features/auth/api/authApi'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { initials, roleLabel } from '../user/userPresentation'

const navigationItems: { page: AppPage; label: string; icon: 'home' | 'history' | 'settings' | 'management' }[] = [
  { page: 'home', label: 'Início', icon: 'home' },
  { page: 'reservations', label: 'Minhas reservas', icon: 'history' },
  { page: 'management', label: 'Gestão do RU', icon: 'management' },
  { page: 'settings', label: 'Configurações', icon: 'settings' },
]

function NavigationIcon({ name }: { name: 'home' | 'history' | 'settings' | 'management' }) {
  if (name === 'settings') return <Icon name="settings" />
  return <img src={name === 'management' ? shieldIcon : name === 'home' ? homeIcon : clockIcon} alt="" />
}

function Sidebar({ page, onNavigate, user, onLogout, mobile = false, onClose }: { page: AppPage; onNavigate: (page: AppPage) => void; user: AuthUser; onLogout: () => void; mobile?: boolean; onClose?: () => void }) {
  const navigate = (destination: AppPage) => { onNavigate(destination); onClose?.() }
  return <aside className={mobile ? 'mobile-drawer' : 'sidebar desktop-sidebar'} aria-label={mobile ? 'Menu principal' : undefined}>
    <div className="sidebar-top"><Logo compact markOnly onClick={() => navigate('home')} destination="Ir para o início" />{mobile && <button className="icon-button drawer-close" type="button" onClick={onClose} aria-label="Fechar menu"><Icon name="close" /></button>}</div>
    <nav>{navigationItems.filter((item) => item.page !== 'management' || user.roles.includes('Administrator')).map((item) => <button className={page === item.page ? 'active' : ''} type="button" key={item.page} onClick={() => navigate(item.page)}><span><NavigationIcon name={item.icon} /></span>{item.label}</button>)}</nav>
    <div className="sidebar-account"><span className="avatar">{initials(user.fullName)}</span><span><b>{user.fullName}</b><small>{roleLabel(user)}</small></span></div>
    <button className="sidebar-logout" type="button" onClick={onLogout}><Icon name="logout" />Sair</button>
  </aside>
}

function AppHeader({ title, subtitle, dark, onToggle, onHome, onMenuToggle, onNavigate, onLogout, user }: { title: string; subtitle: string; dark: boolean; onToggle: () => void; onHome: () => void; onMenuToggle: () => void; onNavigate: (page: AppPage) => void; onLogout: () => void; user: AuthUser }) {
  const [profileOpen, setProfileOpen] = useState(false)
  return <header className="app-header">
    <div className="mobile-header-controls"><button className="icon-button menu-button" type="button" onClick={onMenuToggle} aria-label="Abrir menu"><Icon name="menu" /></button><Logo compact markOnly onClick={onHome} destination="Ir para o início" /></div>
    <div className="app-header__copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="app-header__actions">
      <button className="app-theme-toggle" type="button" onClick={onToggle} aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'} title={dark ? 'Modo claro' : 'Modo escuro'}><Icon name={dark ? 'sun' : 'moon'} /></button>
      <div className="profile-menu-wrap"><button className="user-chip" type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-haspopup="menu"><span className="avatar">{initials(user.fullName)}</span><span><b>{user.fullName}</b><small>{roleLabel(user)}</small></span><Icon name="chevron" /></button>{profileOpen && <div className="profile-popover" role="menu"><button type="button" role="menuitem" onClick={() => { onNavigate('settings'); setProfileOpen(false) }}><Icon name="settings" />Configurações de perfil</button><button type="button" role="menuitem" onClick={onLogout}><Icon name="logout" />Sair</button></div>}</div>
    </div>
  </header>
}

export function AppLayout({ page, title, subtitle, dark, onToggle, onNavigate, onLogout, user, children }: { page: AppPage; title: string; subtitle: string; dark: boolean; onToggle: () => void; onNavigate: (page: AppPage) => void; onLogout: () => void; user: AuthUser; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])
  return <main className="app-shell">
    <Sidebar page={page} onNavigate={onNavigate} user={user} onLogout={onLogout} />
    <div className="app-content"><AppHeader title={title} subtitle={subtitle} dark={dark} onToggle={onToggle} onHome={() => onNavigate('home')} onMenuToggle={() => setMenuOpen(true)} onNavigate={onNavigate} onLogout={onLogout} user={user} />{children}</div>
    {menuOpen && <><button className="drawer-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" /><Sidebar mobile page={page} onNavigate={onNavigate} user={user} onLogout={onLogout} onClose={() => setMenuOpen(false)} /></>}
  </main>
}
