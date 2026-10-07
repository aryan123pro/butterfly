import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import WingLab from "./WingLab";

export const metadata: Metadata = { title: "Wing Lab" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L1 · 3D" title={<>Wing <span className="iri">Lab</span></>}>
        A Blue Morpho coloured scale by scale by the thin-film equations. Change the shelves, look underneath, or dive into a ridge.
      </PageHead>
      <WingLab />
    </>
  );
}
