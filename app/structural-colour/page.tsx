import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter1 from "./Chapter1";

export const metadata: Metadata = { title: "Structural colour" };

export default function Page() {
  return (
    <>
      <PageHead
        eyebrow="Chapter 01 · The biological phenomenon"
        title={<>Colour without <span className="iri">pigment</span></>}
        stats={[
          ["0", "molecules of blue pigment in a Morpho wing"],
          ["75 nm", "thickness of one chitin shelf"],
          ["8", "shelves stacked in each ridge"],
          ["~455 nm", "the wavelength they reinforce: blue"],
        ]}
      >
        Grind a Morpho wing into powder and the blue disappears, leaving brown dust. The colour was never a substance. It is a shape: shelves of
        chitin spaced so precisely that only blue light survives the trip back out. This chapter zooms down to those shelves, then rebuilds
        the colour from the physics.
      </PageHead>
      <Chapter1 />
    </>
  );
}
