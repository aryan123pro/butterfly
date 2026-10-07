"use client";
import MorphoTex from "@/components/ch3/MorphoTex";
import VapourRig from "@/components/ch3/VapourRig";
import { Notes, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter3() {
  return (
    <Steps id="ch3" next={{ href: "/wing-lab", label: "Open the Wing Lab" }}>
      <Step title="Vapour sensor">
        <StepHead eyebrow="Step 1 · Application two" title="A wing that can smell a nerve-agent simulant">
          US Air Force Academy researchers piped vapours over a real Morpho didius wing and read the change in its reflection.
        </StepHead>
        <VapourRig />
        <Notes
          say="No heater, no electronics on the wing. The vapour condenses between the lamellae, the gap index rises, and the reflection spectrum changes in a way that depends on which molecule it is."
          show="Point at 120 ppm and 30 ppm. On its own DMMP was detected down to 120 ppm; inside a mixture with dichloromethane it showed up at 30 ppm."
          ask="If DMMP and dichloropentane both just fill the gaps, why do they give different spectra?"
        />
      </Step>

      <Step title="MorphoTex">
        <StepHead eyebrow="Step 2 · Textile industry" title="Colour without a dye bath">
          Teijin&apos;s MorphoTex fibre: 61 alternating layers of polyester and nylon, about 70 nm each.
        </StepHead>
        <MorphoTex />
        <Notes say="Dyeing is one of the most polluting steps in textile manufacturing. A fibre whose colour comes from layer thickness needs no dye at all." />
      </Step>
    </Steps>
  );
}
