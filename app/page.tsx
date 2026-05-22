import { fetchStatusMetrics } from '@/lib/queries'

const statusLabel: Record<string, string> = {
  pendente: 'Pendentes',
  em_producao: 'Em produção',
  rascunho: 'Rascunhos',
  aguardando_aprovacao: 'Aguardando aprovação',
  pronto_para_postar: 'Pronto para postar',
  agendado: 'Agendados',
  postado: 'Postados',
}

export default async function DashboardPage() {
  let total = 0
  let byStatus: Record<string, number> = {}
  let hasError = false

  try {
    const data = await fetchStatusMetrics()
    total = data.total
    byStatus = data.byStatus
  } catch {
    hasError = true
  }

  const keys = Object.keys(byStatus).sort((a, b) => (byStatus[b] ?? 0) - (byStatus[a] ?? 0))

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Painel de Conteúdos</h2>
        <p className="mt-1 text-sm text-slate-600">Monitoramento do pipeline: extraídos, criados, postados e pendentes.</p>
      </header>

      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para carregar dados reais.
        </div>
      ) : (
        <>
          <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Total de registros</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{total}</p>
          </article>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {keys.map((status) => (
              <article key={status} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">{statusLabel[status] ?? status}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{byStatus[status]}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
