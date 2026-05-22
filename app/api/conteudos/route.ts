import { NextRequest, NextResponse } from 'next/server'
import { fetchConteudos } from '@/lib/queries'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const limit = Number(searchParams.get('limit') || '100')

    const items = await fetchConteudos(limit, status)
    return NextResponse.json({ ok: true, count: items.length, items })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'conteudos_error' },
      { status: 500 }
    )
  }
}
