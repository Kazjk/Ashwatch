# Ashwatch visual update — 7 October 2026

Generated with the built-in image-generation tool, then copied into the game's `apps/web/public/ashwatch-assets` directory and connected to the renderer. Originals remain unchanged. These are color textures; they are not separately authored normal/roughness maps.

Files in this folder:
- `limestone-v3.png`: stone floors and foundations.
- `dragon-scales-v3.png`: the rebuilt dragon's skin and scale layers.

Game copies:
- `C:/Users/kkrom/Documents/AshwatchTransfer/ashwatch/apps/web/public/ashwatch-assets/limestone-v3.png`
- `C:/Users/kkrom/Documents/AshwatchTransfer/ashwatch/apps/web/public/ashwatch-assets/dragon-scales-v3.png`

## Final prompts

### Limestone
Create a production game texture, seamless tileable square albedo material, straight orthographic overhead view of weathered medieval limestone cobblestone paving. Small irregular hand-hewn grey warm limestone stones closely fitted, subtle restrained moss and dirt in narrow joints, natural believable chipped edges and fine pores. Realistic PBR base color, neutral diffuse even lighting with NO cast shadows NO perspective NO directional light NO vignette NO border NO text NO objects. Desaturated grey beige stone with sparse muted olive moss. Entire image filled edge-to-edge, perfectly repeating material intended for a 3D medieval fantasy RPG floor and stone foundations. Medium scale, approximately 8 by 8 stones across the image. Save output for use as game asset.

### Dragon scales
Seamless tileable PBR base color texture of mature fantasy dragon scales, orthographic macro surface only. Thousands of small overlapping irregular shield-shaped reptilian scales. Charcoal slate and desaturated dark forest green with weathered muted bronze edges, fine natural pores and subtle wear. Premium realistic medieval fantasy game material. Flat neutral diffuse light, no specular highlights, no directional shadows, no perspective, no body silhouette, no eyes, no text, no borders. Uniform density edge-to-edge, intended to wrap onto a 3D dragon mesh. Square texture.

## Implementation and limits

The dragon mesh was rebuilt in code with a shaped neck and jaw, horns, teeth, claws, ribbed wing membranes, layered scales, tail movement, breathing, and distinct wing poses. Trees now use cutout foliage instead of solid geometric crowns. Hills, atmosphere, light balance, material detail, and field of view were adjusted.

The tutorial progresses through movement, evasion, attacking, accepting a guild contract, hunting, claiming the reward, and resting at a lodge. A gold route follows traversable cells around buildings. Tutorial progress is saved per character in browser storage; skipping and restarting are supported.

Sight increased from 180–260 to 420–600 world units and from a 72–92° to a 112–128° forward cone. Camera vertical field of view is 62° landscape and 82° portrait. Rear enemies remain undisclosed by the server. These are implementation values, not an on-screen stat display.

This is a substantial prototype revision, not a claim of visual parity with commercial mobile RPGs. Character rigs, animation fidelity, full physically based material sets, and device performance still need further art and optimization work.
