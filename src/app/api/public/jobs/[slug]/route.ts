import { prisma } from '@/lib/db'
import { corsHeaders, json, rateLimitOk } from '@/lib/integration'
import { jobPublic, jobPublicFiltre } from '@/lib/jobs-public'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) })
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const cors = corsHeaders(req)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimitOk('public-job-' + ip, 60)) {
    return json({ success: false, error: 'rate_limited' }, 429, cors)
  }

  const { slug } = await params
  const ilan = await prisma.job.findFirst({
    where: { slug, ...jobPublicFiltre() },
  })

  if (!ilan) return json({ success: false, error: 'not_found' }, 404, cors)

  return json({ success: true, job: jobPublic(ilan) }, 200, cors)
}