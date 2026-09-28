// One-off outreach sender. Not part of the deployed app -- run manually
// with plain `node` (Node 22.6+ runs .ts files directly, no build step):
//
//   node scripts/outreach/send.ts                        (dry run, default -- writes previews, sends nothing)
//   node scripts/outreach/send.ts --test=you@vopria.com   (send ONE real email to yourself, not any prospect -- see it land for real first)
//   node scripts/outreach/send.ts --send                  (actually sends to every prospect in the batch)
//   node scripts/outreach/send.ts --send --limit=3        (send to only the first 3, for a smoke test)
//
// Reads RESEND_API_KEY from .env.local. Keeps a sent-log so re-running
// --send never double-emails the same address, and checks a suppression
// list so anyone who's opted out is skipped even if they're still in the
// batch data.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { Resend } from 'resend'
import { batch1 } from './data/batch1.ts'
import { batch2 } from './data/batch2.ts'
import { batch3 } from './data/batch3.ts'
import { batch4 } from './data/batch4.ts'
import { batch5 } from './data/batch5.ts'
import { renderOutreachHtml, renderOutreachText } from './lib/template.ts'

const allLeads = [...batch1, ...batch2, ...batch3, ...batch4, ...batch5]

// This is a standalone script, not part of the Next.js app, so .env.local
// isn't loaded automatically -- do it ourselves.
function loadEnvLocal() {
  const envPath = path.join(import.meta.dirname, '..', '..', '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()

const FROM = 'Vopria <hello@mail.vopria.com>'
const REPLY_TO = 'info@vopria.com'

const SENT_LOG_PATH = path.join(import.meta.dirname, 'sent-log.json')
const SUPPRESSION_PATH = path.join(import.meta.dirname, 'suppression.json')
const PREVIEW_DIR = path.join(import.meta.dirname, 'previews')

function loadJsonArray(filePath: string): string[] {
  if (!existsSync(filePath)) return []
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function main() {
  const args = process.argv.slice(2)
  const send = args.includes('--send')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
  const testArg = args.find((a) => a.startsWith('--test='))
  const testEmail = testArg ? testArg.split('=')[1] : undefined

  if (testEmail) {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set (check .env.local is loaded).')
      process.exit(1)
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const sample = allLeads[0]
    ;(async () => {
      const { error } = await resend.emails.send({
        from: FROM,
        to: testEmail,
        replyTo: REPLY_TO,
        subject: `[TEST] ${sample.subject}`,
        html: renderOutreachHtml(sample),
        text: renderOutreachText(sample),
      })
      if (error) {
        console.error('Test send failed:', error)
        process.exit(1)
      }
      console.log(`Test email sent to ${testEmail} (sample: ${sample.company}). Not recorded in sent-log -- no prospect was touched.`)
    })()
    return
  }

  const sentLog = new Set(loadJsonArray(SENT_LOG_PATH))
  const suppression = new Set(loadJsonArray(SUPPRESSION_PATH).map((e) => e.toLowerCase()))

  const candidates = allLeads.filter((e) => {
    if (suppression.has(e.email.toLowerCase())) {
      console.log(`SKIP (suppressed): ${e.company} <${e.email}>`)
      return false
    }
    if (sentLog.has(e.email.toLowerCase())) {
      console.log(`SKIP (already sent): ${e.company} <${e.email}>`)
      return false
    }
    return true
  })

  const toProcess = limit ? candidates.slice(0, limit) : candidates

  if (!send) {
    if (!existsSync(PREVIEW_DIR)) mkdirSync(PREVIEW_DIR, { recursive: true })
    for (const e of toProcess) {
      const html = renderOutreachHtml(e)
      const file = path.join(PREVIEW_DIR, `${e.company.replace(/[^a-z0-9]+/gi, '-')}.html`)
      writeFileSync(file, html, 'utf8')
    }
    console.log(`\nDRY RUN — wrote ${toProcess.length} preview(s) to ${PREVIEW_DIR}`)
    console.log('Nothing was sent. Re-run with --send to actually email these.')
    return
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set (check .env.local is loaded).')
    process.exit(1)
  }
  const resend = new Resend(process.env.RESEND_API_KEY)

  ;(async () => {
    for (const e of toProcess) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: e.email,
        replyTo: REPLY_TO,
        subject: e.subject,
        html: renderOutreachHtml(e),
        text: renderOutreachText(e),
      })

      if (error) {
        console.error(`FAILED: ${e.company} <${e.email}> —`, error)
        continue
      }

      console.log(`SENT: ${e.company} <${e.email}>`)
      sentLog.add(e.email.toLowerCase())
      writeFileSync(SENT_LOG_PATH, JSON.stringify([...sentLog], null, 2), 'utf8')

      // Space sends out -- no need to look like a burst of automated mail.
      await new Promise((r) => setTimeout(r, 4000))
    }
    console.log(`\nDone. ${sentLog.size} total addresses recorded in sent-log.json.`)
  })()
}

main()
