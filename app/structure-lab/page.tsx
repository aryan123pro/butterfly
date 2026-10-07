import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import StructureLab from "./StructureLab";

export const metadata: Metadata = { title: "Structure Lab" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L3 · 3D" title={<>Structure <span className="iri">Lab</span></>}>
        Run the physics backwards. Pick a wavelength or any colour, and the chitin shelves rebuild themselves to reflect it.
      </PageHead>
      <StructureLab />
    </>
  );
}
