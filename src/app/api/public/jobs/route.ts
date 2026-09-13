import { prisma } from '@/lib/db'
import { corsHeaders, json, rateLimitOk } from '@/lib/integration'
import { jobPublic, jobPublicFiltre } from '@/lib/jobs-public'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) })
}

export async function GET(req: Request) {
  const cors = corsHeaders(req)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimitOk('public-jobs-' + ip, 60)) {
    return json({ success: false, error: 'rate_limited' }, 429, cors)
  }

  const ilanlar = await prisma.job.findMany({
    where: jobPublicFiltre(),
    orderBy: { yayinTarihi: 'desc' },
  })

  return json({ success: true, jobs: ilanlar.map(jobPublic) }, 200, cors)
}