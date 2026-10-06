import { morphoStack, type MorphoParams } from "./optics";

/* Engineered security-tag stacks, chosen by scanning thickness/gap space for strong,
   opposite colour shifts (second/third-order Bragg peaks give the magenta). */
export const TAG_A: MorphoParams = { dc: 120, da: 480, N: 6 }; // magenta at 0°, teal-green at 45°
export const TAG_B: MorphoParams = { dc: 200, da: 490, N: 6 }; // green at 0°, magenta at 45°
export const MORPHO: MorphoParams = { dc: 75, da: 110, N: 8 };

export const tagA = () => morphoStack(TAG_A);
export const tagB = () => morphoStack(TAG_B);
