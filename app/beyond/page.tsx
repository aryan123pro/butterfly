import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter3 from "./Chapter3";

export const metadata: Metadata = { title: "Beyond the banknote" };

export default function Page() {
  return (
    <>
      <PageHead
        eyebrow="Chapter 03 · More applications"
        title={<>The same shelves, <span className="iri">four more jobs</span></>}
        stats={[
          ["ppm", "nerve-agent simulants detected by a wing"],
          ["2.9 mK", "temperature difference seen without cooling"],
          ["61 layers", "of 70 nm polymer in MorphoTex fibre"],
          ["0 W", "to hold a Mirasol image on screen"],
        ]}
      >
        Anything that changes the spacing or the filling of the shelves changes the colour. Let vapour in and you have a gas sensor. Let heat
        expand them and you have a thermal camera. Fix them in polymer and you have dye-free fabric. Move a mirror with a voltage and you have
        a display.
      </PageHead>
      <Chapter3 />
    </>
  );
}
