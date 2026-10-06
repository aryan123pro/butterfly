# Morpho Lab

Interactive models for **Bio-inspired Security & Anti-counterfeiting Technology**: how the Blue Morpho butterfly makes colour without pigment, and how that physics becomes security tags, vapour sensors, thermal imagers, dye-free fabric and reflective displays.

Every structural colour on the site is computed live in the browser with the transfer-matrix method for thin-film stacks and CIE 1931 colour matching.

## Contents

- **Chapter 1, Structural colour:** 3D nano-dive (wing → scales → ridges → lamellae), multilayer interference, stack tuner, iridescence, diffraction, structure-vs-pigment experiments
- **Chapter 2, Anti-counterfeiting:** scale of the problem, why conventional features fail, 3D specimen note with a colour-shifting stripe, resolution microscope, UV/heat stress test, cost and trade-offs
- **Chapter 3, Beyond the banknote:** Morpho vapour sensor, IR thermal imaging, MorphoTex, Mirasol IMOD display, research timeline and future concepts
- **Playgrounds:** Wing Lab, Spot the Fake, Vapour Lab, Tag Forge
- **Reference:** sources, the original slides, team

Presenting: `P` toggles speaker notes, `←` `→` move between steps, `F` is full screen, `Ctrl K` jumps anywhere.

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

Next.js 16 (App Router), React 19, TypeScript, three.js with React Three Fiber, drei and postprocessing. No backend and no environment variables, so it deploys as-is to Vercel.

## Team

C106 Sarthak Agarwal · C122 Saharsh B · C123 Sanidhya Bakliwal · C129 Bhavishya Bhaloria
