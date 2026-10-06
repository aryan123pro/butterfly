export interface PageInfo { id: string; href: string; k: string; title: string; sub: string }

export const CHAPTERS: PageInfo[] = [
  { id: "ch1", href: "/structural-colour", k: "01", title: "Structural colour", sub: "How a wing with no blue pigment became the bluest thing in the rainforest" },
  { id: "ch2", href: "/anti-counterfeit", k: "02", title: "Anti-counterfeiting", sub: "Turning that physics into a tag a forger cannot print" },
  { id: "ch3", href: "/beyond", k: "03", title: "Beyond the banknote", sub: "Gas sensing, thermal vision, dye-free fabric and a screen with no backlight" },
];

export const LABS: PageInfo[] = [
  { id: "wing", href: "/wing-lab", k: "L1", title: "Wing Lab", sub: "Fly a 3D Morpho, then dive 100,000× into one scale" },
  { id: "fake", href: "/spot-the-fake", k: "L2", title: "Spot the Fake", sub: "Tilt, breathe on and scan four specimens. One is lying." },
  { id: "vapour", href: "/vapour-lab", k: "L3", title: "Vapour Lab", sub: "Identify a nerve-agent simulant with a wing and a spectrometer" },
  { id: "forge", href: "/tag-forge", k: "L4", title: "Tag Forge", sub: "Design a nano-tag with a hidden image, then try to forge it" },
];

export const REFS: PageInfo[] = [
  { id: "ref", href: "/references#timeline", k: "R", title: "Research timeline", sub: "From Hooke in 1665 to KolourOptik in 2013" },
  { id: "ref", href: "/references#sources", k: "R", title: "Sources", sub: "Every number on this site, with its paper" },
  { id: "ref", href: "/references#slides", k: "R", title: "Presentation", sub: "The original slide deck" },
  { id: "ref", href: "/references#team", k: "R", title: "Team", sub: "C106 · C122 · C123 · C129" },
];

export const TRACKED = [...CHAPTERS, ...LABS];

export function store<T>(key: string, val?: T): T | null {
  try {
    if (val === undefined) { const raw = localStorage.getItem("morpholab." + key); return raw ? (JSON.parse(raw) as T) : null; }
    localStorage.setItem("morpholab." + key, JSON.stringify(val));
  } catch { /* storage blocked: the site works without it */ }
  return null;
}
