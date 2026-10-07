import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import Chapter2 from "./Chapter2";

export const metadata: Metadata = { title: "Anti-counterfeiting" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Chapter 02 · Application one" title={<>A tag a forger <span className="iri">cannot print</span></>} />
      <Chapter2 />
    </>
  );
}
