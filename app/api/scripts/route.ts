import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const SCRIPTS_DIR = '/root/.hermes/scripts'

export async function GET() {
  try {
    const entries = await fs.readdir(SCRIPTS_DIR, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile() && (e.name.endsWith('.py') || e.name.endsWith('.sh')))
      .map((e) => e.name)

    const items = await Promise.all(
      files.map(async (name) => {
        const fullPath = path.join(SCRIPTS_DIR, name)
        const stat = await fs.stat(fullPath)
        return {
          nome: name,
          caminho: fullPath,
          tamanho: stat.size,
          mtime: stat.mtime.toISOString(),
        }
      })
    )

    items.sort((a, b) => (a.mtime < b.mtime ? 1 : -1))
    return NextResponse.json({ ok: true, count: items.length, items })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'scripts_error' },
      { status: 500 }
    )
  }
}
