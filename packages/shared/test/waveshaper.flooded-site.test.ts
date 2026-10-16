// Waveshaper: "Flood a site near your body of water until you do so again. Tap minions without
// submerge there. They don't untap the next time they would." Nothing asks for a DRY site, so a
// site another effect already flooded (Atlantean Fate) can be waved too, tapping down the minions
// on it — the script only offered dry sites. And a permanently flooded site must stay flooded
// when the wave later moves on (siteStillFlooded can't re-derive Atlantean Fate's flood).
import { describe, it, expect } from 'vitest'
import { newGame, keepBoth, placeSite, summonCard } from './helpers'
import { makeCtx, getScript } from '../src'

function offered(g: any): { x: number; y: number }[] {
  getScript('Waveshaper')!.abilities![0].effect(makeCtx(g, g.players[0].avatarUnitId, 0, []))
  const p = g.prompts.find((q: any) => q.player === 0)
  g.prompts = []
  return p?.data?.squares ?? []
}

function wave(g: any, x: number, y: number) {
  getScript('Waveshaper')!.conts!.wave(makeCtx(g, g.players[0].avatarUnitId, 0, []), {}, { x, y })
}

describe('Waveshaper on an already-flooded site', () => {
  it('offers it and taps the minions there', () => {
    const g: any = newGame(); keepBoth(g)
    placeSite(g, 0, 'Pond', 2, 1) // my body of water
    const fated = placeSite(g, 1, 'Hamlet', 2, 2); fated.flooded = true // e.g. Atlantean Fate
    const m = summonCard(g, 1, 'Foot Soldier', 2, 2); m.enteredTurn = -1

    expect(offered(g)).toContainEqual({ x: 2, y: 2 })
    wave(g, 2, 2)
    expect(m.tapped).toBe(true)
    expect(m.counters?.skipUntap).toBe(1)
  })

  it('leaves a permanently flooded site flooded when the wave moves on', () => {
    const g: any = newGame(); keepBoth(g)
    placeSite(g, 0, 'Pond', 2, 1)
    const fated = placeSite(g, 1, 'Hamlet', 2, 2); fated.flooded = true
    const dry = placeSite(g, 0, 'Hamlet', 1, 1)

    wave(g, 2, 2)
    wave(g, 1, 1) // "until you do so again"
    expect(dry.flooded).toBe(true)
    expect(fated.flooded, 'the wave dried out a site it did not flood').toBe(true)
  })

  it('still dries a site only the wave flooded', () => {
    const g: any = newGame(); keepBoth(g)
    placeSite(g, 0, 'Pond', 2, 1)
    const a = placeSite(g, 0, 'Hamlet', 2, 2)
    placeSite(g, 0, 'Hamlet', 1, 1)
    wave(g, 2, 2)
    wave(g, 1, 1)
    expect(a.flooded).toBe(false)
  })
})
