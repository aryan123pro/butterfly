import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import VapourLab from "./VapourLab";

export const metadata: Metadata = { title: "Vapour Lab" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L2 · Sensor" title={<>Vapour <span className="iri">Lab</span></>}>
        Expose a Morpho didius wing to five vapours, read the spectrum, and let PCA name them.
      </PageHead>
      <VapourLab />
    </>
  );
}
