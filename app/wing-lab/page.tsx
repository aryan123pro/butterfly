import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import WingLab from "./WingLab";

export const metadata: Metadata = { title: "Wing Lab" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L1 · 3D" title={<>Wing <span className="iri">Lab</span></>}>
        A Blue Morpho whose every scale is coloured by the thin-film equations. Change the shelves, flood them with liquid, swap the structure
        for pigment, look underneath, or dive 120,000&times; into a single ridge.
      </PageHead>
      <WingLab />
    </>
  );
}
