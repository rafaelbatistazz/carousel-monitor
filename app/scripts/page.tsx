import { fetchRoteiros } from '@/lib/queries'

function excerpt(text: string | null | undefined, max = 220) {
  if (!text) return '—'
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export default async function ScriptsPage() {
  let roteiros: Awaited<ReturnType<typeof fetchRoteiros>> = []
  let hasError = false

  try {
    roteiros = await fetchRoteiros(80)
  } catch {
    hasError = true
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Roteiros de Gravação</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aqui ficam os scripts de conteúdo gerados no fluxo (campo <code>novo_script</code> do Supabase), não automações da VPS.
        </p>
      </header>

      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          Não foi possível carregar os roteiros do Supabase.
        </div>
      ) : (
        <div className="space-y-4">
          {roteiros.map((r) => (
            <article key={r.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{r.status}</span>
                <span className="text-xs text-slate-500">{r.arroba_referencia ?? 'sem origem'}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{new Date(r.updated_at).toLocaleString('pt-BR')}</span>
              </div>

              <h3 className="mt-2 text-base font-semibold text-slate-900">{r.titulo ?? 'Sem título'}</h3>
              <p className="mt-2 text-sm text-slate-700">{excerpt(r.novo_script, 320)}</p>

              <details className="mt-3 rounded-md bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Ver roteiro completo</summary>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-800">{r.novo_script ?? '—'}</pre>
              </details>
            </article>
          ))}

          {roteiros.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Nenhum roteiro encontrado com <code>novo_script</code> preenchido.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
