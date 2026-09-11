# Vopria: business summary for lead generation

Written to be pasted as context into a prompt for an agent doing lead research
or outreach copy. Describes the product as built, not as hoped for. Keep it
updated when pricing or sectors change.

---

## What Vopria is

Vopria is a UK web application that does two jobs for small and medium
employers. It gets new starters ready for day one, and it keeps the staff they
already have in date on the training, licences, checks and registrations their
sector legally requires.

The company is UK-only, sells business to business, and operates entirely
online at vopria.com. There is no implementation project and no salesperson:
an employer signs up, picks their sector, and the relevant requirements are
switched on for them.

## The two products, sold separately or together

**Onboarding.** A guided checklist for each new starter. Right to work
evidence with guidance on acceptable documents, National Insurance number,
bank details for payroll, emergency contacts, P45, proof of address, photo ID
and policy sign-offs. The employer reviews and approves each item, chases
nothing manually because reminders and escalations are automatic, and gets a
timestamped audit trail of every upload, approval and consent.

**Compliance.** A record of every requirement each employee must hold, with
the date it expires and who is about to lapse. A library of 96 requirements
covers care, construction, hospitality, logistics, security and corporate
work. The employer ticks what applies to them, scopes requirements to role
groups such as Drivers or Kitchen, and receives reminders at ninety, thirty
and seven days before anything expires. Anything that legally stops a person
working is escalated the day it lapses. Evidence is stored, employees can
upload their own renewals for approval, and everything exports to a
spreadsheet for an inspector or another system.

## Who to target

- **UK employers with 20 to 200 people.** Below twenty they rarely feel the
  pain. Above two hundred they are usually on an enterprise HR system already,
  though Vopria does sell to them on a custom plan.
- **Multi-site or shift-based operations** feel it hardest, because records
  end up scattered across branches, managers and spreadsheets.
- **Regulated or inspected sectors**, where a lapsed record is a shutdown
  risk rather than an administrative annoyance.
- **High staff turnover** makes the onboarding half compelling on its own.

## Sectors, and the specific hook for each

**Care.** Inspected by the Care Quality Commission. DBS checks, NMC
registration and revalidation, the Care Certificate, Oliver McGowan training
which became a legal expectation under the Health and Care Act 2022, moving
and handling of people, medication competency, safeguarding, basic life
support, infection prevention. A lapsed DBS on a care worker is an
inspection finding.

**Construction.** CSCS cards, CPCS and NPORS plant tickets, SSSTS and SMSTS,
IPAF and PASMA, CISRS scaffolding, asbestos awareness, face-fit testing for
masks, Gas Safe registration, NRSWA street works, Network Rail Sentinel.
Most sites will refuse entry to anyone whose card has expired, so a lapse
costs a day's labour immediately.

**Logistics.** Driver CPC, which since December 2024 splits into National and
International variants where a driver on National cannot legally work EU
routes. Digital tachograph cards, vocational licence medicals which fall due
at 45 then every five years then annually from 65, ADR dangerous goods,
forklift tickets, DVLA licence checks, the operator's licence. Audited by the
DVSA and the Traffic Commissioner.

**Hospitality.** Food hygiene levels 2 and 3, allergen awareness under
Natasha's Law, HACCP, personal licences which no longer expire in England and
Wales but need refresher training at five years and renewal at ten in
Scotland, Challenge 25, legionella awareness. Environmental health officers
inspect and publish a public rating.

**Security.** SIA licences, which are a criminal offence to work without for
both the individual and the employer, plus BS 7858 screening.

**Corporate and professional services.** Accountancy, legal, estate agency,
financial services, agencies and consultancies. Display screen assessments,
fire marshals, data protection and cyber awareness, the annual ICO fee,
licence checks for anyone driving their own car on business, anti-money
laundering training required on an ongoing basis by the 2017 regulations, and
anti-bribery training as part of the Bribery Act adequate procedures defence.

## Job titles that buy

HR manager, HR administrator, office manager, operations manager, practice
manager, founder or managing director in smaller firms. Sector-specific:
registered manager and nominated individual in care, transport manager in
logistics, site manager or contracts manager in construction, general manager
in hospitality.

In companies of this size the buyer is usually the person who currently
maintains the spreadsheet, so pain and authority sit with the same individual.

## Trigger events worth watching for

- An inspection scheduled, failed or newly rated by CQC, an environmental
  health officer, the HSE or the DVSA
- Operator's licence application, variation or public inquiry
- Rapid hiring, a new site, or a new contract requiring evidence of competence
- Insurance or contract renewal demanding proof of training
- Losing the person who kept the spreadsheet
- A near miss, accident or enforcement notice

## Pricing

Two products on one size axis. Monthly, excluding VAT.

| People | Onboarding | Compliance | Both |
|---|---|---|---|
| Up to 25 | £49 | £79 | £99 |
| 26 to 50 | £79 | £139 | £169 |
| 51 to 100 | £109 | £229 | £269 |
| 101 to 200 | £149 | £349 | £399 |

The first three onboardings are free with no card. Annual billing charges ten
months. A first subscription includes a fourteen-day trial with no card taken.
Over 200 people is a custom plan. Payment by invoice and purchase order is
available on request.

## Positioning, including what Vopria is not

Vopria is not a training provider and not a learning management system. It
does not sell or deliver courses. This matters in outreach, because many
prospects will say their training provider already tracks completions.

The honest answer is that a provider tracks what they deliver, which is the
e-learning slice. Nobody tracks the CSCS card, the SIA licence, the tachograph
card, the DBS recheck, the driver medical or the visa expiry, because none of
those come from a course. Those are also the items that stop someone working.
And no inspector accepts training in one portal, DBS in a spreadsheet and
cards in a drawer: the single view and the export are the product.

It is also not payroll and not a full HR information system. It sits alongside
them and exports to them.

## Disqualifiers

- Fewer than about fifteen employees, unless heavily regulated
- No UK operations, since the entire requirement library is UK law
- Already running a full HRIS with a compliance module
- Sole traders and partnerships with no employees

## Where the leads actually are

Every one of these is a public register, and everyone listed on them has a
statutory obligation Vopria tracks.

- **Companies House API**, free with a key. Filter by SIC code: 87100 and
  87300 for care, 41200 and 43xxx for construction, 56101 for restaurants,
  49410 for freight, 80100 for security.
- **Care Quality Commission register**, every registered care provider.
- **Food Standards Agency**, an open API with no key needed, listing every
  registered food business with its hygiene rating. A poor rating is a
  trigger event in itself.
- **Traffic Commissioner**, goods vehicle operator licence holders.
- **Gas Safe register**, searchable by area.

None of these carry email addresses. Those need either an enrichment tool,
published contact addresses from company websites, or manual research.
