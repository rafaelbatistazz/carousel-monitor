import { NextResponse } from 'next/server'
import { fetchStatusMetrics } from '@/lib/queries'

export async function GET() {
  try {
    const metrics = await fetchStatusMetrics()
    return NextResponse.json({ ok: true, ...metrics })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'metrics_error' },
      { status: 500 }
    )
  }
}
