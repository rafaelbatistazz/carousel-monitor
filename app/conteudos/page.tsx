import { fetchConteudos } from '@/lib/queries'

export default async function ConteudosPage() {
  let items: Awaited<ReturnType<typeof fetchConteudos>> = []
  let hasError = false

  try {
    items = await fetchConteudos(200)
  } catch {
    hasError = true
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900">Conteúdos</h2>
        <p className="mt-1 text-sm text-slate-600">Lista em tempo real da tabela Supabase.</p>
      </header>

      {hasError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          Não foi possível consultar o Supabase. Verifique variáveis de ambiente.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Título</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Tema</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Origem</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-slate-900">{item.titulo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.tema ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{item.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.arroba_referencia ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(item.updated_at).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
