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

## Wild frontier — 16 October 2026

- Rust is a visual and gameplay reference only (official Steam page: https://store.steampowered.com/app/252490/Rust/). No Facepunch assets, screenshots, code, audio, logos or map data are shipped. The game remains original medieval/magical Ashwatch. This slice does not match Rust's visual fidelity or feature scope.
- Poly Haven CC0-1.0 assets: Forest Floor, Rock Face, Jolcham Oak Bark 01 and Kloppenheim 01 Pure Sky, downloaded from the documented official API/file endpoints with TLS intact. Asset pages: https://polyhaven.com/a/forest_floor, https://polyhaven.com/a/rock_face, https://polyhaven.com/a/jolcham_oak_bark_01 and https://polyhaven.com/a/kloppenheim_01_puresky. License: https://polyhaven.com/license.
- `public/ashwatch-assets/frontier/PROVENANCE.json` records original download URLs, provider byte counts/MD5 verification and our SHA-256 hashes for all nine 1K JPEG material maps and the 1K HDR sky. Files are self-hosted; runtime play never calls the Poly Haven API. No subscription or paid asset was used.
- `frontier-renderer.ts` and `frontier-land.ts`: original terrain shape, river shape, leaf-card canvas, grass blades, forest arrangement, resource models, timber shelter parts, bedroll, hearth and ward. Terrain positions and trunk colliders are shared with the authoritative simulation. Water normal ripples are original canvas code.
- Frontier adventurers retain the original articulated class meshes with smoother surface normals, worn steel/bronze and cloth roughness; no downloaded character, rig or animation. Legacy supplied/generated assets remain credited above.

- Rock Moss Set 01: CC0 scanned rock meshes and three 1K material maps from https://polyhaven.com/a/rock_moss_set_01. All five original glTF/buffer/image files are self-hosted, unchanged and byte/MD5/SHA-256 verified in PROVENANCE.json. FrontierModels normalizes mesh dimensions in memory and shares geometry/materials across admitted stone resources; failed loading retains the original procedural fallback. No competitor mesh is included.

- oak-branch-cutout-v1.png: original photographic oak spray generated with the built-in image_gen tool on 16 October 2026. Actual 1254×1254 PNG alpha verified; original output copied unchanged into public assets. Full prompt is docs/oak-foliage-prompt.txt; generated asset record/SHA256 are in frontier/GENERATED_ASSETS.json. This is not a Poly Haven CC0 asset or a Rust texture. Current foliage cards use it with dynamic lighting and retain the code-drawn fallback. Competition acceptance of generated assets remains an entrant review gate.

- Full-shelter refinement: original fitted wall corners, enlarged doorway clearance, timber roof and interior cutaway logic in frontier-renderer.ts. Static parts are combined per material; merged geometry and cutaway materials are released when a structure changes or the scene closes. No new external building model or animation.

- Graphics/control refinement: original 256-pixel sawn-grain and staggered cedar-shingle canvas textures, per-board wood tones, braced timber wall geometry and filled gables. Original frontier physique, rounded armor and directional procedural locomotion. No new third-party model or animation ships in this release. Downloaded Quaternius CC0 character/animation packs remain an unintegrated private development trial outside the public source and runtime assets.
