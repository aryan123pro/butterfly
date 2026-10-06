import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import References from "./References";

export const metadata: Metadata = { title: "Reference" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Reference" title={<>Sources, slides <span className="iri">&amp; team</span></>}>
        The research timeline, every paper behind the numbers on this site, the original presentation and the people who made it.
      </PageHead>
      <References />
    </>
  );
}
