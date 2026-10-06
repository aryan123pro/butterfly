import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter2 from "./Chapter2";

export const metadata: Metadata = { title: "Anti-counterfeiting" };

export default function Page() {
  return (
    <>
      <PageHead
        eyebrow="Chapter 02 · Application one"
        title={<>A tag a forger <span className="iri">cannot print</span></>}
        stats={[
          ["$470B", "counterfeit trade each year"],
          ["0%", "colour loss after 1000 h of UV"],
          ["~10⁹", "nanostructures per cm²"],
          ["250–500 °C", "thermal stability"],
        ]}
      >
        How can butterfly-wing optics make authentication that is visually distinctive, technically verifiable and very difficult to replicate?
        This chapter follows the idea from the size of the problem to a working security stripe, then tests it against UV, heat, a microscope
        and a cost sheet.
      </PageHead>
      <Chapter2 />
    </>
  );
}
