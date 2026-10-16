import { describe, it, expect } from 'vitest'
import { newGame, keepBoth, summonCard } from './helpers'
import { isDisabled } from '../src'
import '../src/cards/scripts/index'

// disabledByEffect asks, for every other unit, whether THAT unit is itself disabled before checking
// whether it disables anything at all. Off the disabler index (stale after any new entity — every
// cloned search state) that recursion walks every unit at every level: exponential in the number of
// units. A dozen minions turned one isDisabled query into seconds and froze the search bot.
// Only a unit that would actually disable this one needs its own state checked.
// (a disabler that is itself disabled is covered by basilisk.disable.test.ts)
describe('isDisabled stays cheap on a busy board', () => {
  it('answers for every unit on a 16-minion board without exploding', () => {
    const g = newGame(); keepBoth(g)
    const units = []
    for (let i = 0; i < 16; i++) units.push(summonCard(g, (i % 2) as 0 | 1, 'Bone Jumble', i % 5, Math.floor(i / 5)))
    g.flow = { ...(g.flow ?? {}), disablerIndex: undefined } // the full-scan path
    const t0 = Date.now()
    for (const u of units) expect(isDisabled(g, u)).toBe(false)
    expect(Date.now() - t0, 'milliseconds for 16 queries').toBeLessThan(500)
  })

})
