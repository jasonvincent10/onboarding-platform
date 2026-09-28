import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { Resend } from 'resend'

const envPath = path.join(import.meta.dirname, '..', '..', '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    if (process.env[m[1]] !== undefined) continue
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const resend = new Resend(process.env.RESEND_API_KEY)
const { data, error } = await resend.emails.send({
  from: 'Vopria <hello@mail.vopria.com>',
  to: 'info@vopria.com',
  replyTo: 'info@vopria.com',
  subject: '[TEST 2] delivery diagnostic',
  html: '<p>diagnostic test</p>',
  text: 'diagnostic test',
})
console.log('send result:', JSON.stringify({ data, error }, null, 2))

if (data?.id) {
  await new Promise((r) => setTimeout(r, 2000))
  const fetched = await resend.emails.get(data.id)
  console.log('fetched status:', JSON.stringify(fetched, null, 2))
}
