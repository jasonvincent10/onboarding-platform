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
    'Vopria helps UK organisations find where AI genuinely raises productivity. We map how your business really works, train your people, and build the workflows and agentic systems that follow.',
  email: 'jason@vopria.com',
  locale: 'en_GB',
  country: 'United Kingdom',
} as const

/**
 * Header and footer navigation.
 *
 * The home page carries the main argument; the detail lives on its own pages,
 * reached from here. Anchors point at sections that remain on the home page,
 * paths at the further-reading pages.
 */
export const nav = [
  { label: 'Services', href: '/#services' },
  { label: 'Method', href: '/#how-we-work' },
  { label: 'What you get', href: '/what-you-get' },
  { label: 'Safe AI', href: '/safe-ai' },
  { label: 'Working with us', href: '/working-with-us' },
  { label: 'FAQ', href: '/faq' },
] as const

/**
 * Title and meta description for each further-reading page. Keeping them here
 * means page copy and page metadata are edited in the same file.
 */
export const pages = {
  whatYouGet: {
    path: '/what-you-get',
    title: 'What you get',
    description:
      'The five deliverables every Vopria engagement produces: an AI Maturity Profile, Opportunity Matrix, Deep-Dive Packs, AI Opportunity Report and Impact Report.',
  },
  safeAi: {
    path: '/safe-ai',
    title: 'Safe AI adoption',
    description:
      'Shadow AI, acceptable use policies, approved business-grade tools, UK GDPR and human oversight. How we help UK organisations adopt AI safely.',
  },
  workingWithUs: {
    path: '/working-with-us',
    title: 'Working with us',
    description:
      'What a Vopria engagement looks like from first call to measured result, with illustrative examples of the kind of work it produces.',
  },
  faq: {
    path: '/faq',
    title: 'Frequently asked questions',
    description:
      'Common questions about working with Vopria: discovery timescales, how much of your team’s time it takes, data handling, and who owns what we build.',
  },
} as const

export const cta = {
  primary: 'Book a discovery call',
  secondary: 'See how we work',
  short: 'Book a call',
} as const

export const hero = {
  eyebrow: 'AI consultancy for UK organisations',
  heading: 'AI that fits how your business actually works.',
  subheading:
    'We dig into your processes, procedures and workflows to find the efficiency opportunities that are unique to your business. Then we show you exactly where AI raises productivity, train your team to use it with confidence, and build the tools if you want us to.',
  primaryCta: { label: cta.primary, href: '/contact' },
  secondaryCta: { label: cta.secondary, href: '/#how-we-work' },
  assurances: ['No generic playbooks', 'Commercially measured', 'UK-based'],
} as const

export const problem = {
  id: 'problem',
  eyebrow: 'The problem',
  heading: 'Most teams are stuck at stage one.',
  body: [
    'Your staff have discovered AI. They use it to rewrite an awkward email, summarise a long document, or get a first draft moving. That is genuinely useful. It is also roughly one per cent of what these tools can do.',
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
    'Almost every organisation we meet sits at stage one or two. The compounding gains, the ones that show up in your numbers, start at stage three.',
  caption: "Wherever your team is today, we'll take them to the next level.",
  // Points from the ladder to the service that actually moves teams up it.
  trainingLink: {
    text: 'AI Capability Training is how we move teams up the ladder',
    href: '/#services',
  },
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
        'AI stops being a place you visit and becomes part of the pipeline. It is triggered by real events and writes back into the systems you already use.',
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

export const competitive = {
  id: 'competitive',
  eyebrow: 'Staying competitive',
  heading: 'Some uses of AI are becoming standard. Others still set a business apart.',
  body: 'In every sector there is now a baseline: the things competitors are quietly doing that clients and staff have started to expect. Above that baseline sits a much smaller set of moves that genuinely differentiate. The two are not the same, and the line between them moves at a different speed in every industry.',
  closing:
    'We show you where your business sits against both: what you need to match simply to keep pace, and where you have room to lead.',
  ctaLabel: 'Find out where you stand',
  markers: [
    {
      label: 'Table stakes',
      body: 'What your sector already expects. Catching up here protects your position; it does not advance it.',
    },
    {
      label: 'Differentiators',
      body: 'The smaller set of moves specific to how you work, where being early is still worth something.',
    },
  ],
} as const

export const services = {
  id: 'services',
  eyebrow: 'What we do',
  heading: 'Three ways to start.',
  intro:
    'Pick the route that matches where you are. Each one stands on its own, so you are never committing to what comes after it.',
  items: [
    {
      slug: 'targeted-review',
      title: 'Targeted Review',
      hook: "You know where the problem is. We'll go deep.",
      body: 'A focused review of one process, team or department. Best when something specific is already costing you time and you want it examined properly rather than guessed at.',
    },
    {
      slug: 'whole-business-review',
      title: 'Whole-Business Review',
      hook: 'The full picture, ranked.',
      body: 'Every team and every significant process, scored and compared. The result is a prioritised AI roadmap for the business rather than a list of ideas for one department.',
    },
    {
      slug: 'ai-foundations',
      title: 'AI Foundations',
      hook: 'Safe, confident first steps.',
      body: 'For businesses just starting out: an AI policy your staff will actually follow, approved business-grade tools, the security basics, and training to get everyone moving in the same direction.',
    },
  ],
  followOn: {
    heading: 'Then, if you want us to',
    intro:
      'Neither of these is a condition of the work above. Plenty of clients take the findings and run with them internally.',
    items: [
      {
        slug: 'capability-training',
        title: 'AI Capability Training',
        body: 'Hands-on sessions that move your team from simple AI tasks to building their own workflows, tailored to the work they actually do.',
        // Links across to the maturity ladder, which this service is the
        // practical answer to — see maturity.trainingLink.
        laddered: true,
        highlight: false,
      },
      {
        slug: 'build-implement',
        title: 'Build & Implement',
        body: 'We design and build the tools, automations and agentic workflows for you, and hand them over with training and documentation.',
        laddered: false,
        highlight: true,
        badge: 'Full delivery',
      },
    ],
  },
} as const

export const method = {
  id: 'how-we-work',
  eyebrow: 'Our method',
  heading: 'The Vopria Discovery Method.',
  intro:
    'Four steps, in order. Each one produces something you can act on, and you can stop after any of them.',
  steps: [
    {
      number: 1,
      name: 'Map',
      body: 'We capture how your business really works, quickly and remotely, with minimal disruption to your team.',
    },
    {
      number: 2,
      name: 'Measure',
      body: 'Every process is scored using the Vopria Opportunity Index, so priorities are based on evidence, not guesswork.',
    },
    {
      number: 3,
      name: 'Model',
      body: 'We go deep on the processes that matter most and design exactly where AI fits.',
    },
    {
      number: 4,
      name: 'Mobilise',
      body: 'We train your people and implement the changes, then measure the results.',
    },
  ],
} as const

export const deliverables = {
  id: 'what-you-get',
  eyebrow: 'What you get',
  heading: 'Five things you keep.',
  intro:
    'Not a slide deck and a handshake. Every engagement produces documents your team can act on long after we have left.',
  items: [
    {
      title: 'AI Maturity Profile',
      body: 'Where each of your teams sits on the AI maturity ladder today, so you can see the gap between departments as well as the gap to where you want to be.',
    },
    {
      title: 'Opportunity Matrix',
      body: 'A one-page view of every opportunity we find, plotted by value, effort and risk, so the sequencing argument is settled before it starts.',
    },
    {
      title: 'Deep-Dive Packs',
      body: 'Step-by-step analysis of your highest-value processes as they run today, alongside the AI-enabled future state and what it takes to get there.',
    },
    {
      title: 'AI Opportunity Report',
      body: 'Your findings and roadmap, written up in full and presented in person to your leadership team rather than emailed over.',
    },
    {
      title: 'Impact Report',
      body: 'Results measured against the baseline we took at the start, so the value is evidenced rather than asserted.',
    },
  ],
  matrix: {
    label: 'Illustrative example',
    title: 'Opportunity Matrix',
    caption:
      'Every process we assess is plotted by the value of fixing it against the effort to do so, and shaded by delivery risk. Generic examples shown.',
    axes: { value: 'Value', effort: 'Effort' },
    // Shown only on narrow screens, where the chart scrolls sideways.
    scrollHint: 'Scroll sideways to see the full chart',
    // Fictional, deliberately generic processes — never client data.
    //
    // Values are spaced roughly evenly down the scale so that no two dot
    // labels can collide horizontally, and efforts are spread so each
    // quadrant holds two points. Changing these is fine; keep the values
    // about 10 apart or labels will start overlapping.
    points: [
      { label: 'Client onboarding', value: 90, effort: 62, risk: 'medium' },
      { label: 'Invoice processing', value: 78, effort: 22, risk: 'low' },
      { label: 'Proposal drafting', value: 66, effort: 44, risk: 'medium' },
      { label: 'Contract review', value: 56, effort: 84, risk: 'high' },
      { label: 'Email triage', value: 46, effort: 14, risk: 'low' },
      { label: 'Month-end reporting', value: 36, effort: 56, risk: 'medium' },
      { label: 'Complaints handling', value: 26, effort: 74, risk: 'high' },
      { label: 'Supplier vetting', value: 16, effort: 36, risk: 'low' },
    ],
    riskLegend: [
      { level: 'low', label: 'Lower risk' },
      { level: 'medium', label: 'Medium risk' },
      { level: 'high', label: 'Higher risk' },
    ],
  },
} as const

export const security = {
  id: 'security',
  eyebrow: 'Safe adoption',
  heading: "Is your team already using AI you don't know about?",
  intro:
    'In most businesses we look at, the answer is yes. Staff are pasting documents, customer details and draft contracts into personal AI accounts because it makes their job easier and nobody has told them otherwise. That is not a discipline problem. It is a policy gap.',
  points: [
    {
      title: 'Shadow AI',
      body: 'Personal accounts handling business data, outside your systems and invisible to you. The first step is finding out what is actually being used, without blame.',
    },
    {
      title: 'Acceptable use, in plain English',
      body: 'An AI policy short enough that people read it and specific enough that they can follow it. What is fine, what needs checking, and what must never go near a chatbot.',
    },
    {
      title: 'Approved, business-grade tools',
      body: 'Giving staff a sanctioned tool that is genuinely good removes the reason to reach for a personal account in the first place.',
    },
    {
      title: 'UK GDPR and data protection',
      body: 'Where personal data is involved, we work to your obligations: lawful basis, data minimisation, and knowing where information actually goes.',
    },
    {
      title: 'Human oversight',
      body: 'Automated steps need a person accountable for the outcome. We design the review points in from the start rather than bolting them on later.',
    },
  ],
  cta: {
    heading: 'Not sure what your team is already using?',
    body: 'That is usually where we start. A short conversation will tell you whether this is worth looking at properly.',
    label: 'Talk to us about safe adoption',
  },
} as const

export const journey = {
  id: 'journey',
  eyebrow: 'What working with us looks like',
  heading: 'From first call to measured result.',
  intro:
    'No long procurement cycle and no open-ended commitment. This is the whole shape of an engagement.',
  steps: [
    { name: 'Free discovery call', body: 'A short conversation to understand your business and whether we can genuinely help.' },
    { name: 'Agreed scope, in writing', body: 'What we will look at, what you will receive, and what it costs. Fixed before we start.' },
    { name: 'Remote-first discovery', body: 'We work around your team with short surveys and a small number of sessions, not weeks on site.' },
    { name: 'Findings presented in person', body: 'We come to you and take your leadership through what we found and what we recommend.' },
    { name: 'Your choice of next step', body: 'Act on it yourself, bring in someone else, or have us build it. No pressure either way.' },
    { name: 'Follow-up to measure results', body: 'We return to compare the outcome against the baseline we took at the start.' },
  ],
  cta: {
    text: 'Step one costs nothing and takes half an hour.',
    label: 'Book a discovery call',
  },
} as const

export const why = {
  id: 'why',
  eyebrow: 'Why Vopria',
  heading: 'Specific, secure, and built to leave you capable.',
  points: [
    {
      title: 'Nothing generic',
      body: 'Every recommendation is grounded in your processes, your systems and your constraints. If it could have been written for any other company, we have not done our job.',
    },
    {
      title: 'Eliminate before automate',
      body: 'We ask whether a step needs to happen at all before we make it faster. Automating work that should have been removed just produces the wrong answer more efficiently.',
    },
    {
      title: 'People first',
      body: 'Your team finishes more capable, not more dependent. We train in the open and document what we build so you are never locked in.',
    },
    {
      title: 'Secure by design',
      body: 'AI is only valuable if it is safe and compliant. Policy, data handling and human oversight are part of the design from the start, not a review at the end.',
    },
    {
      title: 'Measured results',
      body: 'We take a baseline before anything changes and come back to compare against it. Value you cannot evidence is an opinion.',
    },
  ],
  // Jason's own words. The note stays hidden while any paragraph or the name
  // still contains a [PLACEHOLDER], so it reappears automatically once filled.
  // See lib/placeholders.ts.
  founder: {
    heading: 'A note from our founder',
    body: [
      "I'm Jason, founder of Vopria. My career has been in commercial and procurement roles in some of the most demanding environments in the UK, including Defence Intelligence at the Ministry of Defence, BAE Systems, Network Rail and Transport for London. That's where I learned how organisations really work: the processes, the handoffs, and where time and money quietly leak away. The lessons apply to any business, from a 10-person firm to a national programme.",
      "I'm also a builder. I use AI every day to design and build working software, automate my own workflows and cut admin out of both my working and personal life. Vopria brings those two things together: a commercial eye for where the value is, and the hands-on ability to build what captures it.",
    ],
    name: 'Jason',
    role: 'Founder, Vopria',
    /** Stands in until a photograph is supplied. */
    initial: 'J',
  },
} as const

export const outcomes = {
  id: 'outcomes',
  eyebrow: 'Example outcomes',
  heading: 'What stage three and four look like in practice.',
  disclaimer:
    'These are illustrative example scenarios showing the shape of the work. They are not claims about specific client results.',
  ctaText: 'Wondering what the equivalent would be in your business?',
  ctaLabel: 'Ask us',
  items: [
    {
      title: 'Invoice and document processing',
      stage: 'Stage 3 · Automate',
      body: 'Incoming invoices are read, validated against purchase orders and posted to the finance system automatically. Exceptions, and only exceptions, reach a human queue.',
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
  // [REVIEW] markers are STRIPPED before display — they are notes to you, not
  // copy for visitors, and never reach the page or the structured data. They
  // are still your cue to confirm each answer reflects how you actually work.
  items: [
    {
      question: 'Do we need technical staff to work with you?',
      answer:
        'No. Most of the people we work with are operations, finance and department leads rather than engineers. We need people who understand how the work gets done, and we bring the technical side. If you do have an IT team, we will work alongside them and to their standards. [REVIEW]',
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
        'No, and plenty of clients do not. The Opportunity Report is written so your own team or another supplier can act on it. If you would rather we built it, we can, but the recommendation is never contingent on that. [REVIEW]',
    },
    {
      question: 'What size businesses do you work with?',
      answer:
        'Typically organisations from around 20 to 500 staff, where processes are established enough to be worth optimising but there is no internal AI function. We also work with individual departments inside larger organisations. [REVIEW]',
    },
    {
      question: 'Do you need to be on-site?',
      answer:
        'Mostly no. Discovery is deliberately remote-first, which is faster for us and far less disruptive for you. We come on-site where it genuinely adds value, and we always present final findings to your leadership in person. [REVIEW]',
    },
    {
      question: "How much of our staff's time will it take?",
      answer:
        'Less than you would expect. Typically a short survey for the wider team, a small number of workshops with the people who run the processes we are examining, and optional screen recordings where watching the work is quicker than describing it. We schedule around your operation, not the other way round. [REVIEW]',
    },
    {
      question: 'Who owns what you build?',
      answer:
        'You own your data and the deliverables we produce for you: the reports, the analysis, and anything we build and hand over. Vopria retains its own methods, templates and internal tools, which is what lets us work quickly. This is set out in writing before we start. [REVIEW]',
    },
    {
      question: 'How do you handle our data and any recordings?',
      answer:
        'Consent first, always. We use only the tools you have agreed to, avoid or redact sensitive and personal data wherever it is not essential, and delete any recordings at the end of the engagement. If your organisation has its own data handling rules, we work to those. [REVIEW]',
    },
    {
      question: "What if we're not ready to use AI yet?",
      answer:
        'That is exactly what AI Foundations is for. Plenty of businesses need the policy, the approved tools and the basic training in place before any of the rest makes sense. Starting there is a perfectly sensible answer, and often the right one. [REVIEW]',
    },
  ],
} as const

/**
 * Cards at the foot of the home page pointing to the detail pages. The menu is
 * the primary route to these, but nobody should have to open a menu to find
 * out the rest of the site exists.
 */
export const furtherReading = {
  id: 'further-reading',
  eyebrow: 'Read further',
  heading: 'More detail, when you want it.',
  intro:
    'We have kept this page to the essentials. These go deeper on the parts people usually ask about.',
  items: [
    {
      href: '/what-you-get',
      title: 'What you get',
      body: 'The five deliverables every engagement produces, including an illustrative Opportunity Matrix.',
    },
    {
      href: '/safe-ai',
      title: 'Safe AI adoption',
      body: 'Shadow AI, acceptable use policies, approved tools, UK GDPR and human oversight.',
    },
    {
      href: '/working-with-us',
      title: 'Working with us',
      body: 'What an engagement looks like from first call to measured result, with example outcomes.',
    },
    {
      href: '/faq',
      title: 'Questions',
      body: 'Timescales, how much of your team’s time it takes, data handling, and who owns what we build.',
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
  successHeading: 'Thank you. Your message is on its way.',
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
    'Stage 1, Assist: chat prompts for emails and summaries',
    'Stage 2, Accelerate: shared templates and structured outputs',
    'Stage 3, Automate: connected workflows across tools',
    'Stage 4, Agentic: multi-step AI systems in production',
    'Not sure yet',
  ],
} as const

export const footer = {
  blurb:
    'Vopria helps UK organisations find and build the AI opportunities that are specific to how they actually work.',
  privacyLabel: 'Privacy notice',
  // HIDDEN on the live site while this contains a [PLACEHOLDER]. If Vopria is
  // a registered company you are legally required to show the registered name
  // and number — fill this in and it appears in the footer automatically.
  legalNote: 'Vopria is a trading name of [REGISTERED COMPANY NAME], registered in [ENGLAND AND WALES], company number [COMPANY NUMBER].',
} as const
