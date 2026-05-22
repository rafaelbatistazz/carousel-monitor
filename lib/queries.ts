import { getSupabaseAdmin } from './supabase'

export type ConteudoRow = {
  id: string
  titulo: string | null
  tema: string | null
  status: string
  link_conteudo: string | null
  arroba_referencia: string | null
  shortcode: string | null
  updated_at: string
  created_at: string
}

export async function fetchConteudos(limit = 100, status?: string) {
  const supabase = getSupabaseAdmin()
  let q = supabase
    .from('@rafaelbatistaz Conteudo')
    .select('id,titulo,tema,status,link_conteudo,arroba_referencia,shortcode,updated_at,created_at')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as ConteudoRow[]
}

export type RoteiroRow = {
  id: string
  status: string
  titulo: string | null
  shortcode: string | null
  arroba_referencia: string | null
  novo_script: string | null
  texto_cards: string | null
  updated_at: string
}

export async function fetchRoteiros(limit = 50) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('@rafaelbatistaz Conteudo')
    .select('id,status,titulo,shortcode,arroba_referencia,novo_script,texto_cards,updated_at')
    .not('novo_script', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as RoteiroRow[]
}

export async function fetchStatusMetrics() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('@rafaelbatistaz Conteudo')
    .select('status')

  if (error) throw error

  const byStatus: Record<string, number> = {}
  for (const row of data ?? []) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
  }

  const total = (data ?? []).length
  return { total, byStatus }
}
