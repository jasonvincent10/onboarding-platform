/**
 * Every word of visible copy on the site lives here.
 *
 * Components read from this file and never hardcode prose, so wording can be
 * edited without touching markup. Anything wrapped in [SQUARE BRACKETS] is a
 * placeholder awaiting real content — search for "[" to find them all.
 *
 * UK English throughout (optimise, organisation, programme).
 */

export const site = {
  name: 'Vopria',
  tagline: 'AI that fits how your business actually works',
  description:
    'Vopria helps UK organisations find where AI genuinely raises productivity — mapping your real processes, training your people, and building the workflows and agentic systems that follow.',
  email: 'jason@vopria.com',
  locale: 'en_GB',
  country: 'United Kingdom',
} as const

/** Header and footer navigation. `href` values are anchors on the home page. */
export const nav = [
  { label: 'Approach', href: '/#approach' },
  { label: 'Services', href: '/#services' },
  { label: 'How we work', href: '/#how-we-work' },
  { label: 'FAQ', href: '/#faq' },
] as const

export const cta = {
  primary: 'Book a discovery call',
  secondary: 'See how we work',
  short: 'Book a call',
} as const

export const hero = {
  eyebrow: 'AI consultancy for UK organisations',
  heading: 'AI that fits how your business actually works.',
  subheading:
    'We dig into your processes, procedures and workflows to find the efficiency opportunities unique to your business — then show you exactly where AI raises productivity, train your team to use it with confidence, and build the tools if you want us to.',
  primaryCta: { label: cta.primary, href: '/contact' },
  secondaryCta: { label: cta.secondary, href: '/#how-we-work' },
  assurances: ['No generic playbooks', 'Commercially measured', 'UK-based'],
} as const

export const problem = {
  id: 'problem',
  eyebrow: 'The problem',
  heading: 'Most teams are stuck at stage one.',
  body: [
    'Your staff have discovered AI. They use it to rewrite an awkward email, summarise a long document, or get a first draft moving. That is genuinely useful — and it is roughly one per cent of what these tools can do.',
    'Meanwhile licences get bought, a pilot runs, an announcement goes out, and a year later nobody can point to time or money saved. The advice on offer is generic: the same ten use cases handed to every organisation, regardless of how the work actually gets done.',
    'The gap is not enthusiasm or budget. It is that nobody has looked closely at how your business runs.',
  ],
  points: [
    {
      title: 'Tools bought, value unrealised',
      body: 'Licences are paid for monthly. Nobody can show what changed as a result.',
    },
    {
      title: 'Advice that ignores your business',
      body: 'Generic use cases that were never mapped to your processes, systems or constraints.',
    },
    {
      title: 'Capability that plateaus',
      body: 'Staff plateau at chat prompts because no one has shown them what comes next.',
    },
  ],
} as const

export const maturity = {
  id: 'approach',
  eyebrow: 'The AI maturity journey',
  heading: 'Four stages from chat prompts to working systems.',
  intro:
    'Almost every organisation we meet sits at stage one or two. The compounding gains — the ones that show up in your numbers — start at stage three.',
  caption: "Wherever your team is today, we'll take them to the next level.",
  stages: [
    {
      number: 1,
      name: 'Assist',
      summary: 'Rewriting emails, summarising documents, drafting content.',
      detail:
        'One person, one prompt, one task at a time. Real but modest gains that stay trapped with whoever happened to open the chatbot.',
    },
    {
      number: 2,
      name: 'Accelerate',
      summary: 'Prompt templates, research, analysis and structured outputs built into daily work.',
      detail:
        'The good prompts get captured and shared. Output becomes consistent and repeatable rather than depending on who wrote it.',
    },
    {
      number: 3,
      name: 'Automate',
      summary: 'Connected workflows that remove repetitive manual steps across tools.',
      detail:
        'AI stops being a place you visit and becomes part of the pipeline — triggered by real events, writing back into the systems you already use.',
    },
    {
      number: 4,
      name: 'Agentic',
      summary: 'AI agents and systems that carry out multi-step tasks with human oversight.',
      detail:
        'Whole processes run end to end, with your people reviewing and approving at the points where judgement genuinely matters.',
    },
  ],
} as const

export const services = {
  id: 'services',
  eyebrow: 'What we do',
  heading: 'Four ways we move you up the ladder.',
  intro:
    'Start anywhere. Most organisations begin with discovery, because everything worth doing afterwards depends on knowing where the time actually goes.',
  items: [
    {
      slug: 'process-discovery',
      title: 'Process Discovery',
      body: 'We map your processes and procedures with the people who run them and pinpoint where time, cost and effort are lost.',
      highlight: false,
    },
    {
      slug: 'opportunity-report',
      title: 'AI Opportunity Report',
      body: 'A bespoke report and presentation showing exactly where AI can improve productivity in your business, prioritised by impact and effort.',
      highlight: false,
    },
    {
      slug: 'capability-training',
      title: 'AI Capability Training',
      body: 'Hands-on sessions that move your staff from stage 1 to building their own workflows, tailored to their real tasks.',
      highlight: false,
    },
    {
      slug: 'build-implement',
      title: 'Build & Implement',
      body: 'We design and build the tools, systems, automations and agentic workflows for you, and hand them over with training and documentation.',
      highlight: true,
      badge: 'Full delivery',
    },
  ],
} as const

export const process = {
  id: 'how-we-work',
  eyebrow: 'How we work',
  heading: 'Four steps, in order.',
  intro:
    'No lengthy transformation programme. Each step produces something you can act on, and you can stop at any point.',
  steps: [
    {
      number: 1,
      name: 'Discover',
      body: 'We sit with the people doing the work and map how it really happens — not how the process document says it does.',
    },
    {
      number: 2,
      name: 'Diagnose',
      body: 'We quantify where time and cost are lost, then rank the AI opportunities by impact against effort.',
    },
    {
      number: 3,
      name: 'Educate',
      body: 'We train your team on their own tasks, so capability stays in the building once we leave.',
    },
    {
      number: 4,
      name: 'Implement',
      body: 'If you want it built, we build it — workflows, automations and agentic systems, handed over documented.',
    },
  ],
} as const

export const why = {
  id: 'why',
  eyebrow: 'Why Vopria',
  heading: 'Specific, commercial, and built to leave you capable.',
  points: [
    {
      title: 'Nothing generic',
      body: 'Every recommendation is grounded in your processes, your systems and your constraints. If it could have been written for any other company, we have not done our job.',
    },
    {
      title: 'Commercially focused',
      body: 'We measure value in hours returned and cost removed, agreed with you up front. Interesting technology that does not move those numbers is a hobby, not a project.',
    },
    {
      title: 'People first',
      body: 'Your team finishes more capable, not more dependent. We train in the open and document what we build so you are never locked in.',
    },
    {
      title: 'End to end',
      body: 'Advice, training and delivery from one partner. No handing a strategy deck to a separate build team who were not in the room.',
    },
  ],
  founder: {
    heading: 'A note from our founder',
    // [FOUNDER BIO] — replace with Jason's own words before launch.
    body: '[FOUNDER BIO — commercial background across defence, rail and major infrastructure. Two or three sentences in the first person: the sectors worked in, the scale of the work, and why that commercial grounding shapes how Vopria approaches AI.]',
    name: '[FOUNDER NAME]',
    role: 'Founder, Vopria',
  },
} as const

export const outcomes = {
  id: 'outcomes',
  eyebrow: 'Example outcomes',
  heading: 'What stage three and four look like in practice.',
  disclaimer:
    'These are illustrative example scenarios showing the shape of the work — not claims about specific client results.',
  items: [
    {
      title: 'Invoice and document processing',
      stage: 'Stage 3 · Automate',
      body: 'Incoming invoices are read, validated against purchase orders and posted to the finance system automatically. Exceptions — and only exceptions — reach a human queue.',
      metric: 'Manual keying removed from a daily finance task',
    },
    {
      title: 'Proposal drafting workflow',
      stage: 'Stage 3 · Automate',
      body: 'A structured brief generates a first-draft proposal using your own language, past bids and pricing rules, ready for a specialist to refine rather than start from scratch.',
      metric: 'First draft in minutes instead of half a day',
    },
    {
      title: 'Internal knowledge assistant',
      stage: 'Stage 4 · Agentic',
      body: 'Staff ask questions of your policies, procedures and technical documentation in plain English and get answers cited back to the source document and section.',
      metric: 'Policy answers without interrupting a colleague',
    },
  ],
} as const

export const faq = {
  id: 'faq',
  eyebrow: 'FAQ',
  heading: 'Questions we get asked first.',
  // [REVIEW] — these are sensible placeholder answers. Confirm each one
  // reflects how you actually work before the site goes live.
  items: [
    {
      question: 'Do we need technical staff to work with you?',
      answer:
        'No. Most of the people we work with are operations, finance and department leads rather than engineers. We need people who understand how the work gets done — we bring the technical side. If you do have an IT team, we will work alongside them and to their standards. [REVIEW]',
    },
    {
      question: 'How long does discovery take?',
      answer:
        'For a single department, typically two to three weeks from kick-off to presented findings. Organisation-wide discovery runs longer and is usually broken into departments so you see value early rather than waiting for one large report. [REVIEW]',
    },
    {
      question: 'Is our data safe?',
      answer:
        'We work to your data policies, not around them. Discovery needs conversations and process detail rather than bulk data extracts. Where a build does require access to business data, we agree the handling, retention and hosting arrangements in writing first, and favour approaches that keep your data inside your own systems. [REVIEW]',
    },
    {
      question: 'Do we have to use you to implement?',
      answer:
        'No, and plenty of clients do not. The Opportunity Report is written so your own team or another supplier can act on it. If you would rather we built it, we can — but the recommendation is never contingent on that. [REVIEW]',
    },
    {
      question: 'What size businesses do you work with?',
      answer:
        'Typically organisations from around 20 to 500 staff, where processes are established enough to be worth optimising but there is no internal AI function. We also work with individual departments inside larger organisations. [REVIEW]',
    },
  ],
} as const

export const finalCta = {
  heading: 'Find out where AI can make the biggest difference in your business.',
  body: 'A short discovery call, no charge and no obligation. We will talk through how your team works today and where the realistic gains are.',
  button: { label: cta.primary, href: '/contact' },
} as const

export const contactPage = {
  eyebrow: 'Get in touch',
  heading: "Let's find your biggest opportunity.",
  intro:
    'Tell us a little about your organisation and where your team is with AI today. We read every message ourselves and reply within two working days.',
  formHeading: 'Send us a message',
  directHeading: 'Prefer to talk?',
  directBody:
    'Book a 30-minute discovery call at a time that suits you, or email us directly and we will come back to you.',
  successHeading: 'Thank you — your message is on its way.',
  successBody:
    'We have received your enquiry and will reply within two working days. If it is urgent, email us directly and mark it so.',
  fields: {
    name: { label: 'Your name', placeholder: 'Jane Smith' },
    email: { label: 'Work email', placeholder: 'jane@company.co.uk' },
    company: { label: 'Company', placeholder: 'Acme Engineering Ltd' },
    role: { label: 'Your role', placeholder: 'Operations Director' },
    companySize: { label: 'Company size' },
    aiStage: { label: 'Where is your team with AI today?' },
    message: { label: 'How can we help?', placeholder: 'Tell us about the processes that take up the most time…' },
    consent: {
      label:
        'I agree that Vopria may use these details to respond to my enquiry, as described in the privacy notice.',
    },
  },
  companySizes: [
    'Just me',
    '2–10 staff',
    '11–50 staff',
    '51–200 staff',
    '201–500 staff',
    '500+ staff',
  ],
  aiStages: [
    'Stage 1 — Assist: chat prompts for emails and summaries',
    'Stage 2 — Accelerate: shared templates and structured outputs',
    'Stage 3 — Automate: connected workflows across tools',
    'Stage 4 — Agentic: multi-step AI systems in production',
    'Not sure yet',
  ],
} as const

export const footer = {
  blurb:
    'Vopria helps UK organisations find and build the AI opportunities that are specific to how they actually work.',
  privacyLabel: 'Privacy notice',
  legalNote: 'Vopria is a trading name of [REGISTERED COMPANY NAME], registered in [ENGLAND AND WALES], company number [COMPANY NUMBER].',
} as const
