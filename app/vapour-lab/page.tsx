import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import VapourLab from "./VapourLab";

export const metadata: Metadata = { title: "Vapour Lab" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L3 · Sensor" title={<>Vapour <span className="iri">Lab</span></>}>
        Pipe a vapour over a Morpho wing at room temperature. It condenses between the lamellae, the reflection spectrum shifts, and
        principal component analysis turns that shift into a name. Then try the mystery vial.
      </PageHead>
      <VapourLab />
    </>
  );
}
