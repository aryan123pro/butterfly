# Morpho Lab: context handoff

A briefing for whoever (person or AI agent) picks this project up next.

## What this is

An interactive teaching site that goes with the presentation **"Bio-inspired Security & Anti-counterfeiting Technology"** (team C106 Sarthak Agarwal, C122 Saharsh B, C123 Sanidhya Bakliwal, C129 Bhavishya Bhaloria). It is presented live to first-year engineering students. The source deck is `bio pres.pdf`, which is not in this repo; its 38 slides are rendered in `public/slides/`.

The models were inspired by the reference site dna-and-ga-lab.vercel.app (code at github.com/aryan123pro/DNA-and-GA-Lab). The ambition and the idea of 3D, application-driven models came from it; the UI did not. The owner wants **rich, polished 3D visuals**: flat canvas drawings were rejected as "undermade".

- Repo: https://github.com/aryan123pro/butterfly (branch `main`)
- Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, three.js 0.186, @react-three/fiber 9, drei 10, @react-three/postprocessing 3, motion 14, lucide-react. No backend and no environment variables.
- Run: `npm install`, then `npm run dev`. `npm run build` passes, and all 11 routes prerender as static pages.

## Site map

| Route | What it is | Main files |
|---|---|---|
| `/` | Hero 3D Morpho, the problem, chapter and playground cards, "one idea, five machines" table | `app/page.tsx`, `components/HeroMorpho.tsx`, `components/Thumb.tsx`, `app/home.css` |
| `/structural-colour` | Ch1 (6 steps): 3D nano-dive, wave adder, stack tuner, 3D tilt cards, diffraction, structure-vs-pigment experiments | `app/structural-colour/Chapter1.tsx`, `components/ch1/*` |
| `/anti-counterfeit` | Ch2 (6 steps): OECD chart, conventional features, 3D specimen note with KolourOptik-style stripe, microscope, UV/heat stress, cost and pros/cons | `components/ch2/*`, `components/three/Banknote.tsx` |
| `/beyond` | Ch3 (5 steps): vapour rig diagram, thermal camera, 3D MorphoTex weave, 3D Mirasol IMOD, timeline and future demos | `components/ch3/*` |
| `/wing-lab` | 3D butterfly sandbox plus the nano-dive | `app/wing-lab/WingLab.tsx` |
| `/spot-the-fake` | 5-round 3D game (the deck's slide-2 activity) | `app/spot-the-fake/*` |
| `/vapour-lab` | Vapour sensor with live PCA and a mystery vial | `app/vapour-lab/*` |
| `/tag-forge` | Paint a latent-image tag, auto-design it, attack it with a printed copy | `app/tag-forge/TagForge.tsx` |
| `/references` | Tabs (`#timeline`, `#sources`, `#slides`, `#team`) | `app/references/References.tsx` |

Shared shell: `components/Shell.tsx` (top bar, Ctrl K palette, presenter mode, progress tracker) and `components/ui.tsx` (`Steps`/`Step`, `Notes`, `Range`, `Seg`, `Readouts`, `Plot`, `useRaf`, `useCanvas`, `Connects`). Site registry: `lib/site.ts`. Styles: `app/globals.css`, a single dark theme with tokens on `:root`.

Presenter features: `P` toggles `<Notes>` (Say / Show / Ask the class), `←` `→` move between steps, `F` is full screen, Ctrl K jumps anywhere. Steps deep-link with `#step-N`.

## The physics core (`lib/optics.ts`)

- Transfer-matrix reflectance of a thin-film stack, averaged over s and p polarisation. `reflectance()`, `spectrum()`, `morphoStack({dc, da, N, nc, nf})`, `periodic()`, `braggPeak()`, `peak()`, `visiblePeak()`.
- Colour: CIE 1931 colour-matching functions (Wyman 2013 fit) under a 6504 K blackbody illuminant, converted to sRGB with gamut desaturation. `color()`, `wlColor()`, `mix()`, `fromRgb()`.
- `angleLUT()` returns colour against angle as RGBA bytes. Every 3D structural shader samples this look-up table, so the 3D colours are the same physics as the charts.
- Canvas charting: `plot()`.
- Default Morpho stack: 8 shelves of 75 nm chitin (n = 1.56) with 110 nm air gaps, peaking near 450 nm.
- Engineered designs in `lib/designs.ts`: `TAG_A` 120/480 N6 (magenta to teal), `TAG_B` 200/490 N6 (green to magenta). The Tag Forge pair is base 200/380 N6 against image +40 nm shelf and −60 nm gap: blue head-on, gold when tilted.
- Mirasol pixel (`components/ch3/Mirasol.tsx`): glass n = 1.52 / Cr 6 nm (3.1+3.3i) / oxide 82 nm (n = 1.46) / air gap / Al (1.2+7i). Gap 0 is black; red 238 nm, blue 310 nm, green 390 nm.

The vapour model (`app/vapour-lab/model.ts`) and the thermal model (`components/ch3/Thermal.tsx`) are **teaching models**: the refractive indices are real, and the other constants were tuned to reproduce the deck's figures (PCA about 93.5% of variance against the deck's 91.9–98.1%, 2–3 s recovery, 2.9 mK against 40 mK NETD). The UI says so.

## 3D building blocks (`components/three/`, `lib/scene/materials.ts`)

- `Stage3D`: an R3F `Canvas` with a procedural Lightformer environment (no downloads), Bloom, Vignette and Neutral tone mapping. It renders `flat`, and pauses when off-screen.
- `materials.ts`: `STRUCT_GLSL` (the structural colour function), `structuralMaterial()` (supports instancing and `stripesU`/`stripesV`), `wingMaterial()` (bend, scale glitter, underside pigment texture), `lutTexture()`/`updateLut()`, wing geometry and masks.
- `Butterfly` (props: `lut`, `flap`, `speed`, `amp`, `pigment`, `glint`, `gain`, `light`), `NanoDive` (4 levels: Wing, Scales, Ridges, Lamellae with photons), `Backdrop`, `Banknote`, `Label3D` (drei `Text` using the bundled `public/fonts/IBMPlexMono-Medium.ttf`).

## Hard-won gotchas (read before editing)

1. **One NaN pixel blanks the whole canvas**, because bloom smears it across the frame. Every custom shader must end with the sanitising `TAIL` from `materials.ts` (the NaN check, then `tonemapping_fragment` and `colorspace_fragment`), and must use `safeNormal()`.
2. **Never write `smoothstep(a, b, x)` with a > b.** It is undefined in GLSL and gives NaN on SwiftShader. Use `1.0 - smoothstep(b, a, x)`. This caused two blank-canvas bugs.
3. **Absorbing indices** are passed as `[n, k]` meaning n + ik. `optics.ts` flips them internally to the N = n − ik convention the characteristic-matrix method needs. Without that flip, metals act as gain media and reflectance hits 100% everywhere.
4. **Don't snap the camera or call `controls.update()` on mount** in R3F scenes; it blanked the Wing Lab. Animate toward a goal in `useFrame` instead (see `Underside` in `WingLab.tsx` and `CamZ` in `TagForge.tsx`). Also, the `camera` prop of `Canvas` is only read once.
5. **drei `Html` labels** throw React 19 "synchronously unmount a root" warnings when their parent unmounts. Use `Label3D` instead.
6. **drei `RoundedBox` UVs are split per face.** Don't put a UV-driven shader on it. Use a `RoundedBox` backing plus a `planeGeometry` face (see the Spot the Fake and Tag Forge cards).
7. **JSX attribute strings don't process `\u` escapes.** Use the literal character or `{"·"}`.
8. Shaders output linear colour; LUT values are sRGB bytes, converted with `pow(c, 2.2)` in `lutAt()`.
9. Next 16: `next dev` writes `AGENTS.md`/`CLAUDE.md` and outputs to `.next/dev`. Read `node_modules/next/dist/docs/` before using newer Next APIs.

## How it was verified

Each page was screenshotted with headless Chrome via puppeteer-core (SwiftShader WebGL), console errors were checked, and `tsc --noEmit` plus `next build` both pass. Headless renders at a few frames a second, so animations (the photons in the nano-dive's Lamellae level, flapping) were not seen at full speed.

## Known gaps and ideas

- Not visually verified after the last change: the Tag Forge blue/gold latent pair, and the counterfeit flow in Tag Forge.
- Not yet checked on a phone-width layout; the 3D stages are tall.
- Check performance on the presentation laptop (bloom with 4× multisampling; 2D canvases redraw every frame on some steps).
- Possible next steps: deploy to Vercel (import the repo; no config needed); an SEM-style render mode for the lamellae; sound; a class leaderboard for Spot the Fake.

## Environment notes for this lab PC

- Node.js was installed portably at `%LOCALAPPDATA%\Programs\nodejs`; prepend it to `PATH` in each shell.
- Git is portable MinGit at `%LOCALAPPDATA%\Programs\MinGit\cmd\git.exe`. The push uses an SSH key at `~/.ssh/id_ed25519` (no passphrase) that was added to GitHub. Consider removing that key from GitHub after the presentation, since this is a shared college machine.
