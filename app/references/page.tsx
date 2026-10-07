import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import References from "./References";

export const metadata: Metadata = { title: "Reference" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Reference" title={<>Photos, sources <span className="iri">&amp; team</span></>} />
      <References />
    </>
  );
}
