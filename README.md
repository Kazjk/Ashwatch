# Ashwatch — wild frontier playtest

A browser-based, third-person 3D medieval/magical survival slice inspired by Rust's gather → craft → build → survive rhythm.

- Wild frontier: https://ashwatch-playtest.onrender.com/ashwatch/frontier
- Company watch (the established five-class cooperative encounters): https://ashwatch-playtest.onrender.com/ashwatch

The frontier adds actual rolling terrain, a river, oak woodland, photographed CC0 ground/bark/rock materials and an HDR sky. Harvest fallen timber, stone, herbs and aether at server-confirmed contact. Make a hatchet, food, hearth, timber floor, walls, an operable doorway, roof, bedroll and magical ward. Food, water and warmth change through the day/night cycle. A friendly hearth restores warmth and health; a bedroll changes the actual respawn point.

The map is a compact playable slice, not a Rust-sized open world. Characters and buildings still use original code-built meshes. There is no raiding, structural damage, destruction, full weather, large inventory, terrain editing or durable public persistence. Rust's assets are not included. Visual fidelity is still far below Rust and no award/competition-readiness claim is made.

## Play

Create a room, share its six-character code and have friends select Join friends by code on the same page. No player login or installation is needed. Frontier and company watch have separate browser session keys, so opening the frontier does not discard an existing company character.

WASD/arrows move relative to the camera. Right drag, Q/R or touch look turns the character and following camera. Click/J/1 strikes; hold to repeat. F faces a visible enemy. Space dashes. G calls for cover. K/2 uses your class skill. In the company watch, E also uses the class skill.

In the frontier, E faces the nearest already-visible resource; move closer and press E or hold Strike to gather. E also drinks beside the river and opens/closes a nearby company doorway. B opens the satchel. Choose a building, face clear ground and click Place (or the world). R rotates the plan; Escape cancels. A roof requires a timber floor beneath it. The outline is a plan; the server checks terrain, obstacles, materials, ownership, range and occupancy before building. Menus stop your controls while the shared world continues.

Menu contains persistent sensitivity, camera, volume, graphics and reduced-motion settings. Auto graphics reduces vegetation/terrain detail on narrow screens.

## Run locally

Use Node.js 24.21.0:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm start -- --hostname 0.0.0.0
```

Open http://localhost:3000/ashwatch/frontier. The Windows helper `./start-playtest.ps1` runs the checks and opens port 3011. To run the reproducible two-client survival check against a running server:

```sh
ASHWATCH_URL=http://127.0.0.1:3000 node scripts/frontier-smoke.mjs
```

In PowerShell set `$env:ASHWATCH_URL` before running the script. It creates disposable test characters, harvests real resources, crafts, builds a hearth/bedroll, checks private satchels/shared structures, retries/duplicates, reconnect and forged credentials, then leaves. It cannot establish game feel, audio quality or physical-device compatibility.

To verify a whole paid cabin, including walking inside and closing/reopening its door:

```sh
ASHWATCH_URL=http://127.0.0.1:3000 node scripts/frontier-shelter-smoke.mjs
```

This follows normal walking routes and gathers its actual materials. `ASHWATCH_KEEP_SHELTER=1` retains a successful disposable test company and prints its room code for browser inspection; failures are cleaned up. No credential is printed.

## Multiplayer and hosting limits

Damage, timing, gathering, satchels, needs, structures, doors and respawn are server-authoritative. Snapshots omit unseen enemies and resources. Nearby company-built architecture remains known behind its own walls; rival structures still require perception. Walls, houses, tree trunks and terrain crests obstruct sight; opaque walls obstruct combat. Nearby teammate calls are recipient-relative; actual healing or interruption can acknowledge a frontier call as Covered. Client camera height never grants server visibility.

Snapshots/resume/input can retry once with the same input sequence. Entry, crafting purchases outside input, start, replay and leave are never repeated automatically. Meaningful tests cover lost-contact responses without duplicate costs/damage. Rooms are isolated and expire after 20 minutes without an active company. Local checkpoint files can recover a restart when the files remain available.

**The Render free playtest sleeps after 15 idle minutes and can take about a minute to wake. Its filesystem is ephemeral: rooms, gathered materials and buildings reset after sleep, restart or redeploy. This is not durable release hosting.** Rejoining credentials in browser storage alone cannot restore deleted server data. No paid service was added.

## Credits and evidence

See ASSET_SOURCES.md and the material PROVENANCE.json for all sources, licenses and checksums. Original code-built art and procedural sound are retained. The frontier uses free CC0 Poly Haven materials/sky and no Rust assets.

Automated tests, real protocol clients and direct browser inspection are separate evidence. Audio has not been listened to, physical devices have not been tested and representative human co-op feedback is still outstanding. Competition eligibility, the signed-in mission/Code of Conduct, generated-asset acceptance and the entrant's final submission remain user review gates.
