# Asset sources — Frontier Watch continuation

- `watch-adventurer.ts`: original articulated code-built class meshes, authored for this continuation. The existing class proportions from `adventurer.ts` are retained. No downloaded models or animations.
- `scene3d.ts`: original courtyard layout, banners, eye sigil, guardian/sentinel silhouettes, articulated wolf motion, material palettes, chipped slate floor geometry, procedural wear textures and watch-eye arch crest. Existing supplied terrain/building/creature code remains the basis of the optional open world.
- `feedback.ts`: original synthesized oscillators and envelopes. No samples, recordings or external music.
- Interface icons and visual combat cues: original SVG/Three.js shapes in source.
- No external font requests remain; the interface uses local system fonts.
- `limestone-v3.png` and `dragon-scales-v3.png`: unchanged supplied assets. Earlier notes identify them as generated on 7 October 2026. Limestone is retained for history; current terrain uses code-generated textures. Dragon scales remain in the optional open world. Their prior provenance has not been independently audited.
- Next.js, React and Three.js: existing locked MIT-licensed dependencies. Three.js geometry utilities are used for batching. See package license notices when installing dependencies.

No art, recordings, models, characters, maps or interface assets were imported from Roblox competitors. See the retained `docs/CREDITS.md` and `docs/previous-texture-notes.md` for historical provenance. Competition acceptance of the supplied generated textures still needs confirmation against the signed-in mission and Code of Conduct.

- Controls/graphics revision: original dusk-gradient texture, layered ridges, cut arch stones, ruin masonry and timber in `watch-scenery.ts`; smaller beveled paving in `scene3d.ts`; beveled class armor, cloak emblems, and articulated ash/copper enemy variants in `watch-adventurer.ts`. RoundedBoxGeometry is from the existing MIT-licensed Three.js package. No new external models, images, fonts or recordings.

- Frontier quality art: original flanged hammer, pauldrons, collars/rivets, woven cloth canvas, class staff/hood details, surface-aware batching and cape normals in watch-adventurer.ts. Original lookout/firs and equirectangular dusk in watch-scenery.ts. Materials follow the installed Three.js metallic/roughness workflow; no external models or animations.
- frontier-slate-v1.png: original image created with the built-in image_gen tool during this continuation, not copied from a game or stock site. Full prompt is in docs/frontier-slate-prompt.txt and outputs/Ashwatch-art-prompt.txt. Source PNG preserved unchanged; getImageProps performs standard runtime WebP optimization. Existing 3D slab geometry varies UV orientation/scale. Competition acceptance of generated assets must still be checked in the signed-in mission/Code of Conduct.

- Facing Watch: original rear timber entrance/masonry/firs/ridges/supply cart dressing in watch-scenery.ts, articulated Ashen scouts in watch-enemies.ts, actual-frost material tint and code-built defeat ash/debris in scene3d.ts. No additional downloaded image, model, recording or competitor asset. Old ground-warning shapes are removed from current combat presentation.

- Grounded Watch: original opaque fir branch fans and courtyard-edge grass geometry, travel-driven/grounded articulated gait, frost sheen and compact teammate text in the existing code-built art. Class procedural windup/contact voices are original oscillators/envelopes. No new downloaded image, model, recording, font or competitor asset.

- Public playtest: original five cape crests (blade, frost star, anvil, twin daggers and branching leaf) are authored as batched geometry in watch-adventurer.ts. Matching original interface glyphs are SVG paths in game.tsx. The restrained confirmed-hit recoil is code animation; no new downloaded asset or audio sample.
