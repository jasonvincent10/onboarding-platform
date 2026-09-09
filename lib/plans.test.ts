import { describe, expect, it } from 'vitest'
import {
  BANDS,
  MONTHLY_PRICE_PENCE,
  bandForHeadcount,
  bundleSavingPence,
  bundleSavingPercent,
  entitlementsFor,
  formatPounds,
  modulesForTier,
  pricePence,
  tierForModules,
  type PlanBand,
} from './plans'

const IDS: PlanBand[] = ['25', '50', '100', '200']

describe('modules and tiers', () => {
  it('maps chosen modules to a tier', () => {
    expect(tierForModules([])).toBe('free')
    expect(tierForModules(['onboarding'])).toBe('onboarding')
    expect(tierForModules(['compliance'])).toBe('compliance')
    expect(tierForModules(['onboarding', 'compliance'])).toBe('complete')
    expect(tierForModules(['compliance', 'onboarding'])).toBe('complete')
  })
  it('maps a tier back to its modules', () => {
    expect(modulesForTier('free')).toEqual({ onboarding: false, compliance: false })
    expect(modulesForTier('onboarding')).toEqual({ onboarding: true, compliance: false })
    expect(modulesForTier('compliance')).toEqual({ onboarding: false, compliance: true })
    expect(modulesForTier('complete')).toEqual({ onboarding: true, compliance: true })
    expect(modulesForTier('custom')).toEqual({ onboarding: true, compliance: true })
  })
  it('round-trips every module combination', () => {
    for (const mods of [[], ['onboarding'], ['compliance'], ['onboarding', 'compliance']] as const) {
      const tier = tierForModules([...mods])
      const back = modulesForTier(tier)
      expect(back.onboarding).toBe(mods.includes('onboarding' as never))
      expect(back.compliance).toBe(mods.includes('compliance' as never))
    }
  })
})

describe('prices', () => {
  it('tops out at 399 a month before custom', () => {
    expect(MONTHLY_PRICE_PENCE.complete['200']).toBe(39900)
  })
  it('annual charges ten months', () => {
    for (const band of IDS) {
      expect(pricePence('complete', band, 'year')).toBe(pricePence('complete', band, 'month') * 10)
    }
  })
  it('rises with band for every tier', () => {
    for (const tier of ['onboarding', 'compliance', 'complete'] as const) {
      for (let i = 1; i < IDS.length; i++) {
        expect(MONTHLY_PRICE_PENCE[tier][IDS[i]]).toBeGreaterThan(MONTHLY_PRICE_PENCE[tier][IDS[i - 1]])
      }
    }
  })
  it('bundles cheaper than buying both, by 15 to 30 percent', () => {
    for (const band of IDS) {
      expect(bundleSavingPence(band)).toBeGreaterThan(0)
      expect(bundleSavingPercent(band)).toBeGreaterThanOrEqual(15)
      expect(bundleSavingPercent(band)).toBeLessThanOrEqual(30)
    }
  })
  it('costs less per person as headcount rises', () => {
    for (const tier of ['onboarding', 'compliance', 'complete'] as const) {
      const perPerson = BANDS.map((b) => MONTHLY_PRICE_PENCE[tier][b.id] / b.maxPeople)
      for (let i = 1; i < perPerson.length; i++) {
        expect(perPerson[i]).toBeLessThan(perPerson[i - 1])
      }
    }
  })
  it('prices compliance above onboarding at every size', () => {
    for (const band of IDS) {
      expect(MONTHLY_PRICE_PENCE.compliance[band]).toBeGreaterThan(MONTHLY_PRICE_PENCE.onboarding[band])
    }
  })
  it('formats pounds', () => {
    expect(formatPounds(39900)).toBe('£399')
    expect(formatPounds(4999)).toBe('£49.99')
  })
})

describe('bandForHeadcount', () => {
  it('picks the smallest fitting band', () => {
    expect(bandForHeadcount(1)).toBe('25')
    expect(bandForHeadcount(25)).toBe('25')
    expect(bandForHeadcount(26)).toBe('50')
    expect(bandForHeadcount(50)).toBe('50')
    expect(bandForHeadcount(51)).toBe('100')
    expect(bandForHeadcount(200)).toBe('200')
  })
  it('runs out past the banded range', () => {
    expect(bandForHeadcount(201)).toBeNull()
  })
})

describe('entitlementsFor', () => {
  it('free tier grants nothing paid', () => {
    const e = entitlementsFor({ plan_tier: 'free', subscription_status: 'trial' })
    expect(e.unlimitedOnboarding).toBe(false)
    expect(e.compliance).toBe(false)
    expect(e.headcountCap).toBeNull()
  })
  it('onboarding tier grants onboarding only, and no headcount cap', () => {
    const e = entitlementsFor({ plan_tier: 'onboarding', plan_band: '50', subscription_status: 'active' })
    expect(e.unlimitedOnboarding).toBe(true)
    expect(e.compliance).toBe(false)
    expect(e.headcountCap).toBeNull()
  })
  it('compliance tier grants compliance only, capped by band', () => {
    const e = entitlementsFor({ plan_tier: 'compliance', plan_band: '100', subscription_status: 'trialing' })
    expect(e.unlimitedOnboarding).toBe(false)
    expect(e.compliance).toBe(true)
    expect(e.headcountCap).toBe(100)
  })
  it('complete grants both', () => {
    const e = entitlementsFor({ plan_tier: 'complete', plan_band: '200', subscription_status: 'active' })
    expect(e.unlimitedOnboarding).toBe(true)
    expect(e.compliance).toBe(true)
    expect(e.headcountCap).toBe(200)
  })
  it('past_due keeps access, cancelled and unpaid do not', () => {
    expect(entitlementsFor({ plan_tier: 'complete', plan_band: '25', subscription_status: 'past_due' }).compliance).toBe(true)
    expect(entitlementsFor({ plan_tier: 'complete', plan_band: '25', subscription_status: 'cancelled' }).compliance).toBe(false)
    expect(entitlementsFor({ plan_tier: 'complete', plan_band: '25', subscription_status: 'unpaid' }).unlimitedOnboarding).toBe(false)
  })
  it('custom is entitled and uncapped whatever the status', () => {
    const e = entitlementsFor({ plan_tier: 'custom', subscription_status: 'trial' })
    expect(e.compliance).toBe(true)
    expect(e.unlimitedOnboarding).toBe(true)
    expect(e.headcountCap).toBeNull()
  })
  it('unknown or retired values fall back to free', () => {
    expect(entitlementsFor({ plan_tier: 'comply' }).tier).toBe('free')
    expect(entitlementsFor({ plan_tier: 'onboard' }).tier).toBe('free')
    expect(entitlementsFor(null).tier).toBe('free')
  })
  it('ignores a band that is not on the list', () => {
    expect(entitlementsFor({ plan_tier: 'compliance', plan_band: '75', subscription_status: 'active' }).band).toBeNull()
  })
})
