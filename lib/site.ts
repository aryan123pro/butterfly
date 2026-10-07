export interface PageInfo { id: string; href: string; k: string; title: string; sub: string }

export const CHAPTERS: PageInfo[] = [
  { id: "ch1", href: "/structural-colour", k: "01", title: "Structural colour", sub: "How a wing with no blue pigment became the bluest thing in the rainforest" },
  { id: "ch2", href: "/anti-counterfeit", k: "02", title: "Anti-counterfeiting", sub: "Turning that physics into a tag a forger cannot print" },
  { id: "ch3", href: "/beyond", k: "03", title: "Beyond the banknote", sub: "A wing that senses nerve-agent simulants, and fabric coloured without dye" },
];

export const LABS: PageInfo[] = [
  { id: "wing", href: "/wing-lab", k: "L1", title: "Wing Lab", sub: "Fly a 3D Morpho, then dive 100,000× into one scale" },
  { id: "vapour", href: "/vapour-lab", k: "L2", title: "Vapour Lab", sub: "Expose a Morpho didius wing to vapours and identify them with PCA" },
];

export const REFS: PageInfo[] = [
  { id: "ref", href: "/references#photos", k: "R", title: "Photos", sub: "Real Morpho specimens and electron micrographs" },
  { id: "ref", href: "/references#sources", k: "R", title: "Sources", sub: "Every number on this site, with its paper" },
  { id: "ref", href: "/references#slides", k: "R", title: "Presentation", sub: "The original slide deck" },
  { id: "ref", href: "/references#team", k: "R", title: "Team", sub: "C106 · C122 · C123 · C129" },
];

export const TRACKED = [...CHAPTERS, ...LABS];

/* The presentation, in order. Each stop is one model on screen. Step titles must match the
   <Step title> props in each chapter, because story navigation addresses steps by index. */
export interface StoryPage { href: string; k: string; title: string; steps: string[] }
export const STORY: StoryPage[] = [
  { href: "/structural-colour", k: "01", title: "Structural colour", steps: ["Dive in", "Interfere", "Tune the stack", "Tilt", "Spread", "Prove it"] },
  { href: "/anti-counterfeit", k: "02", title: "Anti-counterfeiting", steps: ["The tag", "Under the microscope", "Is it worth it?"] },
  { href: "/beyond", k: "03", title: "Beyond the banknote", steps: ["Vapour sensor", "MorphoTex"] },
  { href: "/wing-lab", k: "L1", title: "Wing Lab", steps: ["Wing Lab"] },
  { href: "/vapour-lab", k: "L2", title: "Vapour Lab", steps: ["Vapour Lab"] },
  { href: "/references", k: "R", title: "References", steps: ["Photos & sources"] },
];
export const STORY_MINUTES = 20;

export function store<T>(key: string, val?: T): T | null {
  try {
    if (val === undefined) { const raw = localStorage.getItem("morpholab." + key); return raw ? (JSON.parse(raw) as T) : null; }
    localStorage.setItem("morpholab." + key, JSON.stringify(val));
  } catch { /* storage blocked: the site works without it */ }
  return null;
}
