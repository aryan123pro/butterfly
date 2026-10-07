"use client";
import DiveStep from "@/components/ch1/DiveStep";
import Grating from "@/components/ch1/Grating";
import Prove from "@/components/ch1/Prove";
import StackTuner from "@/components/ch1/StackTuner";
import Tilt from "@/components/ch1/Tilt";
import Waves from "@/components/ch1/Waves";
import { Notes, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter1() {
  return (
    <Steps id="ch1" next={{ href: "/anti-counterfeit", label: "Chapter 2: Anti-counterfeiting" }}>
      <Step title="Dive in">
        <StepHead eyebrow="Step 1 · Scale" title="From a 15 cm wing to a 75 nm shelf">
          Press Play the dive. At the last level, white light goes in and only blue comes back.
        </StepHead>
        <DiveStep />
        <Notes
          say="Every level here is about 50 to 200 times smaller than the one before. By the end we are 120,000 times bigger than life, looking at shelves thinner than a wavelength of light."
          show="At the lamellae level, point at the warm-coloured photons dying in the dark floor. That is red and green light being absorbed by melanin."
          ask="If the blue is not a pigment, what would happen if we filled those air gaps with a liquid?"
        />
      </Step>

      <Step title="Interfere">
        <StepHead eyebrow="Step 2 · Multilayer reflection" title="Every shelf sends back a copy of the light">
          When the copies line up crest-on-crest they add. For these shelves that happens near 455 nm: blue.
        </StepHead>
        <Waves />
        <Notes
          say="Slide the wavelength from violet to red. Only around 455 nm do the waves stack crest-on-crest. Everywhere else they partly cancel."
          ask="Why does adding more shelves make the peak both brighter and narrower?"
        />
      </Step>

      <Step title="Tune the stack">
        <StepHead eyebrow="Step 3 · Why blue?" title="Change the shelves, change the colour">
          A live transfer-matrix calculation. The swatch is the colour your eye would see.
        </StepHead>
        <StackTuner />
        <Notes
          say="Evolution tuned two numbers, shelf thickness and gap, to land the peak in the blue. Change either and the wing would be green or violet."
          show="Click 'Soaked in alcohol'. Same shelves, but the gap index rises from 1.00 to 1.38, so the colour shifts to green. Water would not do this: the scales are hydrophobic, so drops bead up and roll straight off and the wing stays blue."
        />
      </Step>

      <Step title="Tilt">
        <StepHead eyebrow="Step 4 · Iridescence" title="Tilt it and the colour slides toward violet">
          Structure shifts with angle. Pigment does not. That is the first thing a security feature exploits.
        </StepHead>
        <Tilt />
        <Notes
          say="Rock the card. The structural card slides from blue toward violet while the pigment card only gets darker. You can check this against the formula on the right."
          ask="A counterfeiter prints a photograph of the structural card. What happens when you tilt the photo?"
        />
      </Step>

      <Step title="Spread">
        <StepHead eyebrow="Step 5 · Diffraction" title="The ridges spread the blue across the sky">
          A CD splits light into a rainbow. Uneven Morpho ridges spread one blue over a wide range of angles.
        </StepHead>
        <Grating />
        <Notes
          say="Switch between CD and Morpho. Same physics, opposite design goal. The CD separates colours; the wing spreads one colour so it can be seen by a mate across the forest canopy."
          show="Push disorder to zero on the Morpho setting. The blue starts breaking into discrete beams."
        />
      </Step>

      <Step title="Prove it">
        <StepHead eyebrow="Step 6 · Structure versus pigment" title="Three tests a pigment would fail">
          Soak it, bleach it, crush it. Structure and dye give opposite answers.
        </StepHead>
        <Prove />
        <Notes
          say="Soaking changes the refractive index, so the colour changes and comes back. Sunlight breaks chemical bonds, so dye fades and structure does not. Crushing destroys the geometry, so structure fails and dye survives."
          ask="Which of these three properties would you want in a banknote security feature, and which would worry you?"
        />
      </Step>
    </Steps>
  );
}
