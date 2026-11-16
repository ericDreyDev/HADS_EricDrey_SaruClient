import { useState } from 'react'
import type { FormEvent } from 'react'
import { deactivateUser, listUsers, roleLabels, saveUser } from './api'
import type { ManagedUser, UserInput, UserRole } from './api'
import { ListFeedback, Pagination } from './ManagementControls'
import { message, queryFromForm, useManagementList } from './managementState'

const subprofiles = ['Graduação UPF', 'Pós-graduação UPF', 'Creati UPF', 'Integrado UPF', 'Comunidade externa', 'Estudante da rede municipal/estadual']

function UserForm({ user, onClose, onSaved, actorId }: { user: ManagedUser | null; onClose: () => void; onSaved: () => void; actorId: number }) {
  const [role, setRole] = useState<UserRole>(user?.role ?? 'Administrator')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const self = user?.id === actorId
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const value = (name: string) => String(form.get(name) ?? '').trim()
    const input: UserInput = {
      firstName: value('firstName'), lastName: value('lastName'), cpf: value('cpf'), email: value('email'),
      phoneNumber: value('phoneNumber') || null, role,
      registration: role === 'Student' ? value('registration') : null,
      badgeNumber: role === 'Professor' || role === 'Employee' ? value('badgeNumber') : null,
      subProfile: role === 'Student' || role === 'Visitor' ? Number(value('subProfile')) : null,
      active: self || !user ? true : form.get('active') === 'on',
      ...(!user ? { password: String(form.get('password') ?? '') } : {}),
    }
    setSubmitting(true); setError('')
    try { await saveUser(input, user?.id); onSaved() }
    catch (reason) { setError(message(reason)) }
    finally { setSubmitting(false) }
  }
  return <section className="management-editor" aria-labelledby="user-form-title">
    <div className="management-heading"><h3 id="user-form-title">{user ? 'Editar usuário' : 'Cadastrar usuário'}</h3><button type="button" onClick={onClose} disabled={submitting}>Fechar formulário</button></div>
    <form onSubmit={submit}>
      <fieldset disabled={submitting} className="management-form-grid">
        <label>Perfil<select value={role} disabled={self} onChange={(event) => setRole(event.target.value as UserRole)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {(role === 'Student' || role === 'Visitor') && <label>Subperfil<select name="subProfile" key={role} defaultValue={user?.role === role ? user.subProfile ?? (role === 'Student' ? 0 : 4) : role === 'Student' ? 0 : 4}>{subprofiles.map((label, index) => (role === 'Student' ? index < 4 : index >= 4) && <option key={index} value={index}>{label}</option>)}</select></label>}
        <label>Nome<input name="firstName" defaultValue={user?.firstName} maxLength={100} required /></label>
        <label>Sobrenome<input name="lastName" defaultValue={user?.lastName} maxLength={100} required /></label>
        <label>CPF<input name="cpf" defaultValue={user?.cpf} maxLength={14} inputMode="numeric" required /></label>
        <label>E-mail<input type="email" name="email" defaultValue={user?.email} maxLength={100} required /></label>
        <label>Telefone (opcional)<input type="tel" name="phoneNumber" defaultValue={user?.phoneNumber ?? ''} maxLength={50} /></label>
        {role === 'Student' && <label>Matrícula<input name="registration" defaultValue={user?.registration ?? ''} maxLength={20} required /></label>}
        {(role === 'Professor' || role === 'Employee') && <label>Crachá<input name="badgeNumber" defaultValue={user?.badgeNumber ?? ''} maxLength={20} required /></label>}
        {!user && <label>Senha inicial<input type="password" name="password" autoComplete="new-password" minLength={8} required /><small>Mínimo de 8 caracteres, com maiúscula, minúscula e número.</small></label>}
        {user && <label className="management-checkbox"><input type="checkbox" name="active" defaultChecked={user.active} disabled={self} />Usuário ativo</label>}
      </fieldset>
      {error && <p className="management-notice" role="alert">{error}</p>}
      <div className="management-actions"><button className="management-primary" disabled={submitting} type="submit">{submitting ? 'Salvando…' : user ? 'Salvar alterações' : 'Cadastrar usuário'}</button><button type="button" onClick={onClose} disabled={submitting}>Cancelar</button></div>
    </form>
  </section>
}

export function ManagedUsers({ actorId }: { actorId: number }) {
  const [filters, setFilters] = useState('')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<ManagedUser | 'new' | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { data, loading, error, reload } = useManagementList(listUsers, `${filters}&page=${page}`)
  const deactivate = async (user: ManagedUser) => {
    if (!window.confirm(`Desativar ${user.firstName} ${user.lastName}? O acesso será bloqueado e o histórico de reservas será preservado.`)) return
    setBusy(true); setFeedback('')
    try { await deactivateUser(user.id); setFeedback('Usuário desativado.'); reload() }
    catch (reason) { setFeedback(message(reason)) }
    finally { setBusy(false) }
  }
  return <section className="management-panel">
    <div className="management-heading"><div><h2>Usuários do RU</h2><p>Cadastre administradores e mantenha os dados dos usuários atualizados.</p></div><button className="management-primary" type="button" onClick={() => { setEditor('new'); setFeedback('') }}>Cadastrar usuário</button></div>
    {editor && <UserForm key={editor === 'new' ? 'new' : editor.id} user={editor === 'new' ? null : editor} actorId={actorId} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setFeedback('Usuário salvo com sucesso.'); reload() }} />}
    <form className="management-filters" onSubmit={(event) => { event.preventDefault(); setFilters(queryFromForm(event.currentTarget)); setPage(1) }}>
      <label>Nome, e-mail, CPF ou matrícula<input name="search" maxLength={200} placeholder="Buscar usuário" /></label>
      <label>Perfil<select name="role"><option value="">Todos</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Situação<select name="active"><option value="">Todas</option><option value="true">Ativos</option><option value="false">Inativos</option></select></label>
      <button className="management-primary" type="submit">Filtrar usuários</button><button type="reset" onClick={() => { setFilters(''); setPage(1) }}>Limpar</button>
    </form>
    {feedback && <p className="management-notice" role="status">{feedback}</p>}
    <ListFeedback loading={loading} error={error} empty={!data.items.length} retry={reload} />
    {!loading && !error && data.items.length > 0 && <div className="management-table-wrap"><table><caption className="sr-only">Usuários cadastrados no RU</caption><thead><tr><th>Nome</th><th>E-mail</th><th>Identificação</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{data.items.map((u) => <tr key={u.id}><td><strong>{u.firstName} {u.lastName}</strong>{u.id === actorId && <small>Sua conta</small>}</td><td>{u.email}</td><td>{u.registration ? `Matrícula: ${u.registration}` : u.badgeNumber ? `Crachá: ${u.badgeNumber}` : '—'}</td><td>{roleLabels[u.role]}</td><td><span className={`management-badge ${u.active ? 'is-success' : ''}`}>{u.active ? 'Ativo' : 'Inativo'}</span></td><td><div className="management-actions"><button type="button" onClick={() => setEditor(u)} disabled={busy}>Editar</button>{u.active && u.id !== actorId && <button type="button" onClick={() => void deactivate(u)} disabled={busy}>Desativar</button>}</div></td></tr>)}</tbody></table></div>}
    {!error && <Pagination data={data} onPage={setPage} loading={loading} />}
  </section>
}
