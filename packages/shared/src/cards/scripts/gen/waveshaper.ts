import { registerScript } from '../registry'
import { getCard, getKeywords } from '../../db'
import { pushLog, siteStillFlooded } from '../../../engine/effects'
import { isWaterSite, nearbySquaresW, siteAt, unitsAt } from '../../../engine/grid'

// 'Tap → Flood a site near your body of water until you do so again. Tap minions
//  without submerge there. They don't untap the next time they would.'
registerScript('Waveshaper', {
  abilities: [{
    key: 'wave',
    label: 'Flood a site near your waters',
    cost: { tap: true },
    effect: (ctx) => {
      const water = Object.values(ctx.state.sites).filter(
        (s) => s.controller === ctx.controller && isWaterSite(ctx.state, s, getCard),
      )
      if (!water.length) return ctx.log('You control no body of water.')
      const squares: { x: number; y: number }[] = []
      for (const w of water) {
        for (const adj of nearbySquaresW(ctx.state, w.x, w.y)) {
          // ANY site near your waters — an already-flooded one too (FAQ3: the same site may be
          // re-selected; and a site some other effect flooded, e.g. Atlantean Fate, still gets its
          // minions tapped down: nothing in the text asks for a dry site).
          if (siteAt(ctx.state, adj.x, adj.y) && !squares.some((q) => q.x === adj.x && q.y === adj.y)) squares.push(adj)
        }
      }
      if (!squares.length) return ctx.log('No site near your waters.')
      ctx.ask({ kind: 'chooseSquare', title: 'The wave crashes over which site?', data: { squares } }, 'wave')
    },
  }],
  conts: {
    wave: (ctx, _c, sq) => {
      const site = sq ? siteAt(ctx.state, sq.x, sq.y) : null
      if (!site) return
      const prev = ctx.state.flow?.waveshaperFlood?.[ctx.controller]
      ctx.state.flow = ctx.state.flow ?? {}
      // a site already flooded by a PERMANENT effect (Atlantean Fate sets `flooded` once; siteStillFlooded
      // can't re-derive it) must stay flooded when the wave later moves on — remember it
      const ownFloods: string[] = ctx.state.flow.floodedBeforeWave ?? []
      if (site.flooded && !siteStillFlooded(ctx.state, site.id) && !ownFloods.includes(site.id)) ownFloods.push(site.id)
      ctx.state.flow.floodedBeforeWave = ownFloods
      // move this Waveshaper's standing wave to the new site FIRST, then re-derive the old site's flood so
      // it stays wet if some OTHER source (a Naiads, another Waveshaper, a Floodplain flood) still floods it
      ctx.state.flow.waveshaperFlood = { ...(ctx.state.flow.waveshaperFlood ?? {}), [ctx.controller]: site.id }
      if (prev && ctx.state.sites[prev]) {
        const keep = prev !== site.id && ownFloods.includes(prev)
        ctx.state.sites[prev].flooded = keep || siteStillFlooded(ctx.state, prev)
        if (keep) ctx.state.flow.floodedBeforeWave = ownFloods.filter((id) => id !== prev)
      }
      ctx.floodSite(site.id)
      for (const u of unitsAt(ctx.state, site.x, site.y, 'surface')) {
        const kw = getKeywords(u.name)
        if (u.isAvatar || kw.submerge) continue
        // "Tap minions without submerge there. They don't untap the next time they would."
        // The untap-skip applies to every non-submerge minion here — including one already tapped
        // (it still must miss its next untap), so the skip marker is set regardless of tap state.
        if (!u.tapped) {
          u.tapped = true
          pushLog(ctx.state, ctx.controller, `${u.name} is dragged under the churn.`)
        }
        u.counters = { ...u.counters, skipUntap: 1 }
      }
    },
  },
})
