import { useEffect, useState } from 'react'
import menuSymbolsLegend from '../../assets/menu-symbols-legend.png'
import { currentMenu, menuImageUrl } from '../management/api'
import type { WeeklyMenuData } from '../management/api'
import { ApiError } from '../auth/api/authApi'
import { Icon } from '../../shared/ui/Icon'

export function WeeklyMenu() {
  const [view, setView] = useState<'menu' | 'legend'>('menu')
  const [imageOpen, setImageOpen] = useState(false)
  const [result, setResult] = useState<{ menu: WeeklyMenuData | null; error: string; revision: number }>({ menu: null, error: '', revision: -1 })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    currentMenu().then((menu) => { if (active) setResult({ menu, error: '', revision }) }).catch((reason) => {
      if (!active) return
      setResult({ menu: null, revision, error: reason instanceof ApiError && reason.status === 404 ? 'O cardápio desta semana ainda não foi publicado.' : 'Não foi possível carregar o cardápio. Tente novamente.' })
    })
    return () => { active = false }
  }, [revision])
  useEffect(() => {
    if (!imageOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setImageOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [imageOpen])
  const { menu, error } = result
  const loading = result.revision !== revision
  const weeklyMenuImage = menu ? menuImageUrl(menu) : ''
  const period = menu ? `${menu.weekStart.split('-').reverse().join('/')} a ${menu.weekEnd.split('-').reverse().join('/')}` : ''
  const isMenu = view === 'menu'
  return <article className="weekly-menu-card">
    <div className="menu-card-heading"><h2>Cardápio da semana</h2><div className="menu-view-switcher" role="group" aria-label="Conteúdo do cardápio"><button className={isMenu ? 'active' : ''} type="button" onClick={() => setView('menu')}>Cardápio</button><button className={!isMenu ? 'active' : ''} type="button" onClick={() => setView('legend')}>Legenda</button></div></div>
    {isMenu && (loading || !menu) ? <div className="management-feedback" role="status"><p>{loading ? 'Carregando cardápio…' : error}</p>{!loading && <button className="text-action" type="button" onClick={() => setRevision((value) => value + 1)}>Atualizar cardápio</button>}</div> : <div className="menu-image-frame"><button className="menu-image-button" type="button" onClick={() => setImageOpen(true)} aria-label={`Ampliar ${isMenu ? 'cardápio semanal' : 'legenda dos símbolos'}`}><img src={isMenu ? weeklyMenuImage : menuSymbolsLegend} alt={isMenu ? 'Cardápio semanal do RU, de segunda a sexta-feira' : 'Legenda dos símbolos alimentares usados no cardápio do RU'} /><span>Ampliar imagem</span></button><p>{isMenu ? `Cardápio vigente: ${period}.` : 'Consulte os símbolos para identificar restrições e características dos alimentos.'}</p></div>}
    {imageOpen && <div className="menu-lightbox-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setImageOpen(false) }}><section className="menu-lightbox" role="dialog" aria-modal="true" aria-label={isMenu ? 'Cardápio semanal ampliado' : 'Legenda dos símbolos ampliada'}><header><h2>{isMenu ? 'Cardápio da semana' : 'Legenda dos símbolos'}</h2><button className="icon-button" type="button" onClick={() => setImageOpen(false)} aria-label="Fechar imagem ampliada"><Icon name="close" /></button></header><div className={`menu-lightbox__scroll ${isMenu ? '' : 'menu-lightbox__scroll--legend'}`}><img src={isMenu ? weeklyMenuImage : menuSymbolsLegend} alt={isMenu ? 'Cardápio semanal do RU ampliado' : 'Legenda dos símbolos alimentares ampliada'} /></div></section></div>}
  </article>
}
