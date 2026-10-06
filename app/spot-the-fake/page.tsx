import type { Metadata } from "next";
import { PageHead } from "@/components/ui";
import SpotTheFake from "./SpotTheFake";

export const metadata: Metadata = { title: "Spot the Fake" };

export default function Page() {
  return (
    <>
      <PageHead eyebrow="Playground L2 · The activity" title={<>Spot the <span className="iri">fake</span></>}>
        Four specimens per round, and one or two are counterfeit. Look straight on and they all match. Tilt them, breathe on them and put
        them under the spectrometer, then accuse. Five rounds, and the forgers get better each time.
      </PageHead>
      <SpotTheFake />
    </>
  );
}
