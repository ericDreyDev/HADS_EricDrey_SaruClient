import { useCallback, useEffect, useState } from 'react'
import type { Paged } from './api'

export function message(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível concluir a operação.' }

export function useManagementList<T>(load: (query: string) => Promise<Paged<T>>, query: string) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ query: string | null; revision: number; data: Paged<T>; error: string }>({ query: null, revision: -1, data: { items: [], total: 0, page: 1, pageSize: 20 }, error: '' })
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  const loading = result.query !== query || result.revision !== revision
  useEffect(() => {
    let active = true
    load(query).then((data) => { if (active) setResult({ query, revision, data, error: '' }) })
      .catch((reason) => { if (active) setResult((previous) => ({ ...previous, query, revision, error: message(reason) })) })
    return () => { active = false }
  }, [load, query, revision])
  return { data: result.data, loading, error: loading ? '' : result.error, reload }
}

export function queryFromForm(form: HTMLFormElement) {
  const query = new URLSearchParams()
  new FormData(form).forEach((value, key) => { if (String(value).trim()) query.set(key, String(value).trim()) })
  return query.toString()
}
