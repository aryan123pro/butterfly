import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter3 from "./Chapter3";

export const metadata: Metadata = { title: "Beyond the banknote" };

export default function Page() {
  return (
    <>
      <PageHead
        eyebrow="Chapter 03 · More applications"
        title={<>The same shelves, <span className="iri">two more jobs</span></>}
        stats={[
          ["30 ppm", "DMMP picked out of a vapour mixture by a real wing"],
          ["91.9%", "of the wing's spectral response in 3 principal components"],
          ["61 layers", "of ~70 nm polymer in MorphoTex fibre"],
        ]}
      >
        Let vapour into the shelves and you have a gas sensor. Fix them in polymer and you have dye-free fabric.
      </PageHead>
      <Chapter3 />
    </>
  );
}
