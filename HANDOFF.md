# Morpho Lab: context handoff

A briefing for whoever (person or AI agent) picks this project up next.

## What this is

An interactive teaching site that goes with the presentation **"Bio-inspired Security & Anti-counterfeiting Technology"** (team C106 Sarthak Agarwal, C122 Saharsh B, C123 Sanidhya Bakliwal, C129 Bhavishya Bhaloria). It is presented live to first-year engineering students. The source deck is `bio pres.pdf`, which is not in this repo; its 38 slides are rendered in `public/slides/`.

The models were inspired by the reference site dna-and-ga-lab.vercel.app (code at github.com/aryan123pro/DNA-and-GA-Lab). The ambition and the idea of 3D, application-driven models came from it; the UI did not. The owner wants **rich, polished 3D visuals**: flat canvas drawings were rejected as "undermade".

- Repo: https://github.com/aryan123pro/butterfly (branch `main`)
- Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript, three.js 0.186, @react-three/fiber 9, drei 10, @react-three/postprocessing 3, motion 14, lucide-react. No backend and no environment variables.
- Run: `npm install`, then `npm run dev`. `npm run build` passes, and all 12 routes prerender as static pages.

## Site map

| Route | What it is | Main files |
|---|---|---|
| `/` | Hero 3D Morpho, chapter and playground cards, "one idea, three machines" table, Start the story | `app/page.tsx`, `components/StartStory.tsx` |
| `/structural-colour` | Ch1 (6 steps): nano-dive, wave adder, stack tuner (no water: the scales are hydrophobic), tilt cards, diffraction, structure-vs-pigment | `app/structural-colour/Chapter1.tsx`, `components/ch1/*` |
| `/anti-counterfeit` | Ch2 (3 steps, models only): 3D specimen note, microscope, cost model | `components/ch2/*`, `components/three/Banknote.tsx` |
| `/beyond` | Ch3 (2 steps): vapour rig with sourced figures, 3D MorphoTex weave | `components/ch3/*` |
| `/wing-lab` | 3D butterfly with eased camera glides and colour morphs, plus the nano-dive | `app/wing-lab/WingLab.tsx` |
| `/structure-lab` | Inverse design: pick a wavelength (quarter-wave rule, refined by TMM) or any colour (grid search + local refine in OKLab), and a 3D lamella close-up morphs to the stack that reflects it. Chitin + air (broad band) or chitin + resin n = 1.40 (narrow, pure) | `app/structure-lab/*`, `lib/inverse.ts` |
| `/vapour-lab` | Vapour sensor rebuilt on Kittle 2017/2020 and Potyrailo 2007/2013: P/P0 control, polarity gradient, Al2O3 coat toggle, PCA | `app/vapour-lab/*` |
| `/references` | Tabs (`#photos`, `#sources`, `#slides`, `#team`); photos are Wikimedia Commons files in `public/photos` | `app/references/References.tsx` |

Story mode (`S`, or "Story mode" in the top bar): full screen, one model per screen, a bottom dock with prev/next across pages, an "all models" panel and a 20-minute clock. The order lives in `STORY` in `lib/site.ts`; its step titles must match the `<Step title>` props. Every 3D stage also has its own full-screen button.

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

The vapour model (`app/vapour-lab/model.ts`) is a **teaching model**. Its vapours, 0.15–0.50 P/P0 range, vapour pressures, refractive indices and mechanism (capillary condensation, polar tops and less-polar bottoms, Al2O3 coat removes selectivity) come from the papers listed in References; uptake constants, depth preferences and swelling are tuned. The deck's "2–3 s recovery" and "70–90 s" figures were dropped because no source supported them. The UI says so.

## 3D building blocks (`components/three/`, `lib/scene/materials.ts`)

- `Stage3D`: an R3F `Canvas` with a procedural Lightformer environment (no downloads), Bloom, Vignette and Neutral tone mapping. It renders `flat`, and pauses when off-screen.
- `materials.ts`: `STRUCT_GLSL` (the structural colour function), `structuralMaterial()` (supports instancing and `stripesU`/`stripesV`), `wingMaterial()` (bend, scale glitter, underside pigment texture), `lutTexture()`/`updateLut()`, wing geometry and masks.
- `Lamellae` (`components/three/Lamellae.tsx`): the parameterised cross-section with photons, driven by a `LamellaeSpec` (dc, da, N, nf, reflected colour, peak, R). Used by the NanoDive's level 4 (Wing Lab passes its live stack) and by the Structure Lab. Tall stacks are squeezed vertically to fit (`lamellaeFit`); the scale bar and HUD say so.
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
