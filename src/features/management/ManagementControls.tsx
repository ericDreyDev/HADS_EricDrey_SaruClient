import type { Paged } from './api'

export function Pagination({ data, onPage, loading }: { data: Paged<unknown>; onPage: (page: number) => void; loading: boolean }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return <div className="management-pagination"><span>{data.total} registro(s) · Página {data.page} de {pages}</span><div><button type="button" disabled={loading || data.page <= 1} onClick={() => onPage(data.page - 1)}>Anterior</button><button type="button" disabled={loading || data.page >= pages} onClick={() => onPage(data.page + 1)}>Próxima</button></div></div>
}

export function ListFeedback({ loading, error, empty, retry }: { loading: boolean; error: string; empty: boolean; retry: () => void }) {
  if (loading) return <p className="management-feedback" role="status">Carregando…</p>
  if (error) return <div className="management-feedback" role="alert"><p>{error}</p><button type="button" onClick={retry}>Tentar novamente</button></div>
  if (empty) return <p className="management-feedback">Nenhum registro encontrado para estes filtros.</p>
  return null
}
