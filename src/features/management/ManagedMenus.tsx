import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { deleteMenu, listMenus, menuImageUrl, saveMenu } from './api'
import type { WeeklyMenuData } from './api'
import { ListFeedback, Pagination } from './ManagementControls'
import { message, useManagementList } from './managementState'
import { normalizeMenuImage } from './menuImage'

const loadMenus = (query: string) => listMenus(Number(query))
const formatDate = (date: string) => date.split('-').reverse().join('/')

export function ManagedMenus() {
  const [page, setPage] = useState(1)
  const [week, setWeek] = useState('')
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { data, loading, error, reload } = useManagementList(loadMenus, String(page))
  useEffect(() => {
    return () => { if (image) URL.revokeObjectURL(image.url) }
  }, [image])
  const prepare = async (file?: File) => {
    setImage(null); setFeedback('')
    if (!file) return
    setPreparing(true)
    try { const blob = await normalizeMenuImage(file); setImage({ blob, url: URL.createObjectURL(blob) }) }
    catch (reason) { setFeedback(message(reason)) }
    finally { setPreparing(false) }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!image) return
    const existing = data.items.some((menu) => menu.weekStart === week)
    if (existing && !window.confirm('Substituir o cardápio publicado para esta semana?')) return
    setBusy(true); setFeedback('')
    try { await saveMenu(week, image.blob); setFeedback('Cardápio publicado. Ele ficará disponível no início durante a semana correspondente.'); reload() }
    catch (reason) { setFeedback(message(reason)) }
    finally { setBusy(false) }
  }
  const remove = async (menu: WeeklyMenuData) => {
    if (!window.confirm(`Excluir o cardápio de ${formatDate(menu.weekStart)} a ${formatDate(menu.weekEnd)}?`)) return
    setBusy(true); setFeedback('')
    try { await deleteMenu(menu.id); setPage(1); reload(); setFeedback('Cardápio excluído.') }
    catch (reason) { setFeedback(message(reason)) }
    finally { setBusy(false) }
  }
  return <section className="management-panel">
    <div className="management-heading"><div><h2>Cardápios semanais</h2><p>Uma imagem por semana, de segunda a sexta-feira. Publique novamente para substituir.</p></div><a className="management-link" href="/modelo-cardapio.svg" download>Baixar modelo</a></div>
    <form className="management-editor" onSubmit={submit}>
      <div className="management-form-grid"><label>Semana (segunda-feira)<input type="date" value={week} required disabled={busy} onChange={(event) => { const value = event.target.value; event.target.setCustomValidity(value && new Date(`${value}T12:00:00`).getDay() !== 1 ? 'Selecione uma segunda-feira.' : ''); setWeek(value) }} /></label><label>Imagem do cardápio<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || preparing} required onChange={(event) => void prepare(event.target.files?.[0])} /><small>PNG, JPG ou WebP · até 5 MB. Ajuste automático para PNG de 1600 × 1000, sem cortes.</small></label></div>
      {preparing && <p role="status">Preparando imagem…</p>}
      {image && <figure className="management-menu-preview"><img src={image.url} alt="Prévia do cardápio padronizado antes da publicação" /><figcaption>Confira a legibilidade antes de publicar.</figcaption></figure>}
      <button className="management-primary" type="submit" disabled={busy || preparing || !image}>{busy ? 'Publicando…' : 'Publicar cardápio'}</button>
    </form>
    {feedback && <p className="management-notice" role="status">{feedback}</p>}
    <ListFeedback loading={loading} error={error} empty={!data.items.length} retry={reload} />
    {!loading && !error && <div className="management-menu-list">{data.items.map((menu) => <article key={menu.id}><a href={menuImageUrl(menu)} target="_blank" rel="noreferrer"><img src={menuImageUrl(menu)} alt={`Cardápio de ${formatDate(menu.weekStart)} a ${formatDate(menu.weekEnd)}`} /></a><div><h3>{formatDate(menu.weekStart)} a {formatDate(menu.weekEnd)}</h3><small>Publicado em {new Date(menu.updatedAt).toLocaleString('pt-BR')}</small><div className="management-actions"><button type="button" disabled={busy} onClick={() => { setWeek(menu.weekStart); setFeedback('Selecione a nova imagem para substituir o cardápio desta semana.') }}>Substituir</button><button type="button" disabled={busy} onClick={() => void remove(menu)}>Excluir</button></div></div></article>)}</div>}
    {!error && <Pagination data={data} onPage={setPage} loading={loading} />}
  </section>
}
