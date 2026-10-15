# Ashwatch — public playtest

Play: https://ashwatch-playtest.onrender.com/ashwatch

A third-person 3D cooperative frontier combat game for 1–5 players. Create a company, share its six-character code, practise, then start the live watch together. No player account or installation is needed in a browser.

Five classes, three encounters and three company oaths support a short run and replay. Facing controls what the server permits each player to perceive. Teammates exchange relative cover calls. Read visible enemy movement, commit a strike, escape and cover each other. Enemy warning rings and countdowns are intentionally absent.

## Playtest changes

Practice attacks now reduce the scout's actual health at server-confirmed contact. Damaged enemies show an overhead bar and numerical health while visible. The practice scout resets 1.5 seconds after defeat. Players take no damage or resource cost in practice. Starting the live watch restores everyone and the first encounter.

## Run locally

Use Node.js 24.21.0. From this directory:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm start -- --hostname 0.0.0.0
```

Open http://localhost:3000/ashwatch. The Windows helper `./start-playtest.ps1` also runs the checks and opens a server on port 3011.

After an interrupted response, snapshots/resume/input can retry once with the same input sequence. Tests verify this cannot duplicate damage or resource costs. Uncertain entry, start, replay, leave and purchases are never repeated automatically. A confirmed hit now gives one damped recoil rather than a rapid wobble; reduced motion suppresses it.

Clicks on an admitted character now aim at that body, rather than the ground behind its head. Opaque scenery blocks this selection; hidden retained meshes and health bars cannot be selected. The server still controls facing permission, reach and damage. Five original cape crests and matching interface glyphs identify each role.

## Controls

WASD/arrows move. Right mouse drag, Q/R, touch look or the right controller stick turn the character and following camera. F faces an already visible threat. J/1/left click strikes; hold to repeat. E/K/2 uses the class skill; Space dashes. Release Strike to backstep or dash while retaining combat facing briefly. H faces an injured visible teammate. G calls for cover. Menu contains persistent sensitivity, camera, volume, graphics and reduced-motion settings.

## Free hosting

Deploy this repository as one long-lived Node web service. Build: `npm ci && npm run build`. Start: `npm start -- --hostname 0.0.0.0 --port $PORT`. Pin NODE_VERSION to 24.21.0. Set NEXT_PUBLIC_ASHWATCH_HOSTING=free before building to show the temporary-host room-reset notice in the game. ASHWATCH_SAVE_DIR may specify a private writable checkpoint directory; never place it under public/ or commit it.

The free Render service is a temporary public playtest. It sleeps after 15 idle minutes and may take about a minute to wake. Rooms and progress are lost when its ephemeral filesystem resets on sleep, restart or redeploy. It does not provide durable accounts or save storage. Create a new company if an old code expires. A persistent host/storage decision remains a separate release gate. See https://render.com/docs/free for current limits. No paid service is required for this playtest.

## Verification and limits

181 tests, type checking, lint and production build passed before publication. All five classes, party sizes 1–5 and three oaths completed 27 deterministic authenticated runs/replays. The production two-client test won in 70.292 seconds, answered four cover calls, interrupted six attacks and verified shared replay, host permissions and forged-token rejection. These checks verify behavior, not enjoyable balance.

Native browser automation confirmed practice damage and shrinking health bars. Earlier two-browser native input completed a full Ironbound/Warden victory and shared replay on the preceding milestone. There is no two-human verdict yet. Audio has not been listened to; physical phones, controllers and captured mouse look remain unverified. A small-screen CSS layout check is not device testing. An unattributed initial-iframe MutationObserver error remains under investigation. Award quality and competition eligibility are not established.

## Assets and isolation

See ASSET_SOURCES.md and docs/CREDITS.md for original code-built art, procedural audio, generated slate and supplied texture provenance. This is the standalone Ashwatch game. No JARVIS application, private company checkpoint, player credential or local working report is included.
