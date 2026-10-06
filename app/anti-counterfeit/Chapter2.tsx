"use client";
import Conventional from "@/components/ch2/Conventional";
import Economics from "@/components/ch2/Economics";
import Problem from "@/components/ch2/Problem";
import Resolution from "@/components/ch2/Resolution";
import Stress from "@/components/ch2/Stress";
import TagLab from "@/components/ch2/TagLab";
import { Connects, Notes, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter2() {
  return (
    <Steps id="ch2" next={{ href: "/beyond", label: "Chapter 3: Beyond the banknote" }}>
      <Step title="The problem">
        <StepHead eyebrow="Step 1 · Scale of the problem" title="Fakes are a $470 billion industry">
          Counterfeiting costs revenue and jobs, and it kills people when the fake is a medicine. Toggle the chart between how often goods are
          seized and how much the seized goods are worth: they tell different stories.
        </StepHead>
        <Problem />
        <Notes
          say="Clothing and shoes are seized most often, but watches carry the most value. A security feature has to be worth its cost on the product it protects."
          ask="Which of these categories would you protect first, and why?"
        />
      </Step>

      <Step title="Why current features fail">
        <StepHead eyebrow="Step 2 · Limitations" title="Watermarks, holograms, ink and RFID all give one predictable answer">
          Click each feature to see how it gets beaten. The common thread is that the check is the same every time, so a forger only needs to
          copy one answer.
        </StepHead>
        <Conventional />
        <Notes
          say="None of these are useless. They raise the cost of forging. But each one gives a fixed response that can be studied and imitated."
          show="Open the hologram card. Rainbow foil is sold by the roll; most people only check that it shimmers."
        />
      </Step>

      <Step title="How the tag works">
        <StepHead eyebrow="Step 3 · KolourOptik-style security stripe" title="Nanostructure → light → effect → authentication">
          This specimen note carries a stripe built from two engineered multilayers. Tilt it, toggle the three effects, then swap in a printed
          copy. Nanotech Security Corp&apos;s KolourOptik, inspired by the Morpho, uses this principle on real banknotes and ID documents.
        </StepHead>
        <TagLab />
        <Notes
          say="Two stacks with different spacings sit next to each other. Because each stack's colour moves with angle at a different rate, the pattern swaps colours as you tilt. That is something no ink can do."
          show="Press 'Swap in a printed copy' and wobble it. Everything freezes."
          ask="Why does a structural tag need nothing but your eyes to check it, while RFID needs a reader?"
        />
      </Step>

      <Step title="Under the microscope">
        <StepHead eyebrow="Step 4 · Resolution" title="Smaller than a printer's smallest dot">
          Zoom both specimens from 2 mm down to 2 µm. The printer runs out of resolution at about 10&ndash;20 µm. The tag keeps going: hidden
          microtext, then individual pillars 250 nm apart.
        </StepHead>
        <Resolution />
        <Notes
          say="A good office printer puts down dots about 20 microns across. The tag's features are about 100 times smaller. A scan and reprint cannot capture what the scanner cannot see."
          ask="How many 250 nm pillars fit across one printer dot?"
        />
      </Step>

      <Step title="Stress test">
        <StepHead eyebrow="Step 5 · Statistical data" title="1000 hours of sun and 500 °C of heat">
          Push the sliders. Dye fades under UV and chars above about 150 &deg;C. A structure made of stable materials has nothing to bleach and
          survives far hotter processes.
        </StepHead>
        <Stress />
        <Notes say="The numbers in this table are from the papers in the reference list. Note the one row the biomimetic tag loses: cost." />
      </Step>

      <Step title="Is it worth it?">
        <StepHead eyebrow="Step 6 · Pros, cons and cost" title="₹6 a tag: cheap for a watch, ruinous for a strip of pills">
          A biomimetic tag costs about ₹5&ndash;8.50 against ₹0.08&ndash;0.40 for a dye label. Pick a product and see what that does to its price.
        </StepHead>
        <Economics />
        <Notes
          say="This is the real engineering decision: the security comes from fabrication being hard. That is also why adoption is slow and why it starts with banknotes and luxury goods."
          ask="What would have to change for these tags to protect medicines in every pharmacy?"
        />
        <Connects items={[
          { href: "/spot-the-fake", t: "Spot the Fake", s: "Now play the forger's victim. Catch the counterfeit specimens." },
          { href: "/tag-forge", t: "Tag Forge", s: "Design your own nano-tag with a hidden image, then attack it." },
          { href: "/beyond", t: "Chapter 3: Beyond the banknote", s: "The same physics senses gas, sees heat and colours fabric." },
        ]} />
      </Step>
    </Steps>
  );
}
