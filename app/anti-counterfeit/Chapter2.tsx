"use client";
import Economics from "@/components/ch2/Economics";
import Resolution from "@/components/ch2/Resolution";
import TagLab from "@/components/ch2/TagLab";
import { Notes, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter2() {
  return (
    <Steps id="ch2" next={{ href: "/beyond", label: "Chapter 3: Beyond the banknote" }}>
      <Step title="The tag">
        <StepHead eyebrow="Step 1 · KolourOptik-style security stripe" title="Tilt it. Then try a printed copy." />
        <TagLab />
        <Notes
          say="Two stacks with different spacings sit next to each other. Each one's colour moves with angle at a different rate, so the pattern swaps colours as you tilt. No ink can do that."
          show="Press 'Swap in a printed copy' and wobble it. Everything freezes."
        />
      </Step>

      <Step title="Under the microscope">
        <StepHead eyebrow="Step 2 · Resolution" title="Zoom from 2 mm to 2 µm" />
        <Resolution />
        <Notes
          say="A good office printer puts down dots about 20 microns across. The tag's pillars are about 100 times smaller, so a scan and reprint cannot capture them."
          ask="How many 250 nm pillars fit across one printer dot?"
        />
      </Step>

      <Step title="Is it worth it?">
        <StepHead eyebrow="Step 3 · Cost" title="Is it worth it?" />
        <Economics />
        <Notes
          say="About ₹5–8.50 a tag against ₹0.08–0.40 for a dye label. A rounding error on a watch, a big share of the price of a strip of pills."
          ask="What would have to change for these tags to protect medicines in every pharmacy?"
        />
      </Step>
    </Steps>
  );
}
