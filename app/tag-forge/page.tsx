import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import TagForge from "./TagForge";

export const metadata: Metadata = { title: "Tag Forge" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L4 · Design" title={<>Tag <span className="iri">Forge</span></>}>
        Be the security engineer. Paint a tag in two nanostructures, tune them so the image vanishes head-on and appears when tilted, add
        vapour-triggered pits, then switch sides and try to forge it with a scanner and a printer.
      </PageHead>
      <TagForge />
    </>
  );
}
