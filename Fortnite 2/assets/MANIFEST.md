# Asset manifest — converted 3D models

Generated 2026-11-06 from `/Users/jake/Desktop/Fortnite/*.zip` with Blender 4.5.11 (mounted DMG, not installed).
Source `.fbx` / `.obj` / `.blend` files are **not loadable in a browser**; these `.glb` files are.

Every number below was measured by re-importing the exported `.glb`, not copied from the source file.

## Loading

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();            // setMeshPerLoad defaults are fine
loader.load('assets/models/wall.glb', (gltf) => scene.add(gltf.scene));
```

`.glb` cannot be fetched over `file://`. Serve the folder (`python3 -m http.server 8000` in `code/Fortnite/`)
and open `http://localhost:8000/`.

## Axis convention

Exports used `export_yup=True`, so glTF/Three.js space is **Y up**. Dims are listed as `x · y(height) · z`.
Where a model's "long axis" is not X, that is called out — weapons differ from each other.

## Build pieces (wood, textured)

| File | x·y·z (m) | tris | Pivot | Notes |
|---|---|---|---|---|
| `wall.glb` | 0.284 · 4.144 · 5.384 | 7,000 | bottom-centre | face normal ±X, width runs along Z |
| `floor.glb` | 5.173 · 0.281 · 5.222 | 1,656 | bottom-centre | |
| `stair.glb` | 5.149 · 4.029 · 5.243 | 1,729 | bottom-centre | rise 4.03 m |
| `cone.glb` | 5.119 · 1.892 · 5.143 | 2,340 | bottom-centre | roof piece |
| `wall.glb` etc. share `wood` / `wood2` / `corde` / `clou` materials | | | | normal map baked at 1024 |

**Grid pitch:** the four pieces are authored on a **5.2 m horizontal pitch with a 4.0 m level height**
(floor/stair/cone/wall all ~5.15–5.38 across). The game currently uses `GRID = 4`, `PIECE_H = 4`
([index.html](file:///Users/jake/Desktop/code/Fortnite/index.html) CORE CONSTANTS). Either set `GRID = 5.2`
to match the art exactly, or scale each piece by `4 / 5.2 = 0.769` and accept ~1 m of plank overhang.
Mixed values are what make pieces look misaligned at corners.

## Weapons and tools

| File | x·y·z (m) | tris | Long axis | Textures |
|---|---|---|---|---|
| `ar.glb` | 0.920 · 0.283 · 0.081 | 7,000 | **X** (muzzle at +X) | none — 38 flat-colour materials |
| `smg.glb` | 0.082 · 0.620 · 0.335 | 5,399 | **Z** (length runs front-back on Z) | `T_Core_SMG_D` |
| `pickaxe.glb` | 0.199 · 0.308 · 1.300 | 3,900 | **Y** (handle vertical) | `T_Pickaxe_Star_Wand_D` |

The AR is the only one whose length is on X, and the pickaxe stands up on Y — a single shared
"grip transform" will orient two of the three wrong. Give each model its own rotation constant.

## Props

| File | x·y·z (m) | tris | Pivot | Notes |
|---|---|---|---|---|
| `chest.glb` | 1.200 · 0.846 · 1.045 | 12,000 | bottom | **untextured** — the source archive shipped no chest textures; brown/steel colours assigned by material name |
| `bus.glb` | 7.200 · 7.200 · 7.200 | 60,000 | centre | geometry is a balloon + bus; set `y = altitude + 3.6` to sit the bus on a height |

Bus materials were hand-wired: the source `bus.obj` declared `mtllib bus.mtl` and **that .mtl is not in the
archive**. Two PBR texture sets (`Material__25`, `__26`) use real BaseColor + Normal; the other six
materials are solid colours chosen to read as Fortnite's red/yellow bus. Metallic/roughness maps exist in
the zip but were not packed into an ORM image, so the bus is not fully PBR.

## Character and glider

| File | x·y·z (m) | tris | Use |
|---|---|---|---|
| `skin_static.glb` | 0.824 · 1.800 · 0.443 | 18,296 | **drop-in** — feet at y=0, already scaled to 1.8 m, no skeleton |
| `skin.glb` | 16.53 units tall | 18,376 | skinned (armature included, **no animation clips**) — needs `node.scale = 0.1089` |
| `glider_static.glb` | 3.000 · 1.085 · 1.066 | 16,648 | **drop-in** — centred, 3 m wingspan |
| `glider.glb` | 364.8 units wide | 16,728 | skinned, needs `node.scale = 0.00822` |

Prefer the `_static` variants. Both skinned files export in rest pose with no actions in the source
`.blend`, so there is nothing to animate yet — a `THREE.AnimationMixer` would have no clips to play.

Both come from `.blend` files whose textures were **packed inside the blend** (body/head colour + normal
at 2048², downscaled to 2048 for `skin.glb` and 1024 for `skin_static.glb`). This is the one asset pair
that could not be read without Blender.

## Island

| File | x·y·z (m) | tris | Size | Notes |
|---|---|---|---|---|
| `map.glb` | 856.486 · 64.085 · 737.524 | 513,745 | 35 MB | 16 materials, all 13 terrain textures matched, bottom at y=0, centred on X/Z |
| `map_low.glb` | 856.486 · 64.088 · 737.524 | 149,727 | 12 MB | same textures, decimated — use on mobile |

Three things to plan around before switching terrain to this:

1. **The island is 856 × 738 m.** The game's `WORLD_SIZE` is 600 and the storm circle, bot wander bounds
   and minimap all derive from it. Either raise `WORLD_SIZE` to ~860 or scale the map node.
2. `map.glb` is 16 mesh nodes joined by material, so collision must raycast against a 513k-triangle
   mesh. Use `map_low.glb` as the collision proxy, or bake a heightfield from it.
3. The island is one fixed layout — randomised loot and bot spawn positions must be moved to places
   that are actually on the terrain. Nothing in the pack is a POI marker.

## Icons

`assets/icons/Med_Kit.png`, `big_pot.png`, `minis.png` — consumed-item icons, unused so far.

## Re-running the conversion

Everything is reproducible: `/tmp/fn-stage/fn_export.py` (Blender headless, `--asset <name>`).
`FN_QUALITY=light` caps textures at 1024. The DMG is mounted at `/tmp/blender-mnt`.
