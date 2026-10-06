"use client";
import Future from "@/components/ch3/Future";
import Mirasol from "@/components/ch3/Mirasol";
import MorphoTex from "@/components/ch3/MorphoTex";
import Thermal from "@/components/ch3/Thermal";
import VapourRig from "@/components/ch3/VapourRig";
import { Connects, Notes, Step, StepHead, Steps } from "@/components/ui";

export default function Chapter3() {
  return (
    <Steps id="ch3" next={{ href: "/wing-lab", label: "Open the Wing Lab" }}>
      <Step title="Vapour sensor">
        <StepHead eyebrow="Step 1 · Application two" title="A wing that can smell nerve agent">
          Researchers at the US Air Force Academy used Morpho didius scales as a vapour sensor: the first natural photonic crystal used to
          detect chemical-warfare simulants. It picked out DMMP and dichloropentane at parts per million and told them apart from ethanol,
          methanol and water.
        </StepHead>
        <VapourRig />
        <div className="grid2" style={{ marginTop: 18 }}>
          <div className="tablewrap">
            <table className="data">
              <thead><tr><th>Parameter</th><th>Butterfly-inspired</th><th>Conventional</th></tr></thead>
              <tbody>
                <tr><td>Data analysis</td><td>91.9&ndash;98.1% PCA variance</td><td>&gt;99% classification (array)</td></tr>
                <tr><td>Detection</td><td>30 ppm DMMP / 50 ppm DCP</td><td>LOD 0.012&ndash;0.025 ppm (VOCs)</td></tr>
                <tr><td>Operating temperature</td><td className="win">room temperature, ~25 &deg;C</td><td className="lose">microheater at 200&ndash;450 &deg;C</td></tr>
                <tr><td>Recovery time</td><td className="win">2&ndash;3 s</td><td className="lose">70&ndash;90 s</td></tr>
              </tbody>
            </table>
          </div>
          <div className="pc">
            <div className="panel"><ul><li>Tells chemically similar compounds apart</li><li>Sensitive to parts per million</li><li>Works at room temperature, no heater</li><li>Instant colour shift</li></ul></div>
            <div className="panel cons"><ul><li>An Al&#8322;O&#8323; protective coat kills the sensing entirely</li><li>Replicating the structure for mass production is hard</li></ul></div>
          </div>
        </div>
        <Notes say="The trade-off is honest: a commercial sensor array is more sensitive, but it needs a heater at several hundred degrees and takes over a minute to recover. The wing works at room temperature and recovers in seconds." />
      </Step>

      <Step title="Thermal imaging">
        <StepHead eyebrow="Step 2 · Application three" title="Seeing heat without a cryocooler">
          The best thermal cameras need cryogenic cooling; uncooled ones are slower and less sensitive. Dope Morpho scales with carbon nanotubes
          and each scale becomes a pixel: infrared warms it, the shelves expand, the colour shifts.
        </StepHead>
        <Thermal />
        <Notes say="Move the hand around, then press 'Find the handprint'. The 0.03 degree trace your hand leaves behind is invisible to the conventional sensor and obvious to the Morpho one." ask="The Morpho pixels are bigger. What does that cost us?" />
      </Step>

      <Step title="MorphoTex">
        <StepHead eyebrow="Step 3 · Textile industry" title="Colour without a dye bath">
          Teijin Fibers built MorphoTex, the world&apos;s first structurally coloured fibre, from 61 alternating layers of polyester and nylon.
          A separate team copied the scales of Morpho sulkowskyi to make coats that shed water drops 40% faster than lotus-leaf designs.
        </StepHead>
        <MorphoTex />
        <Notes say="Dyeing is one of the most polluting steps in textile manufacturing. A fibre whose colour comes from layer thickness needs no dye at all." />
      </Step>

      <Step title="Mirasol display">
        <StepHead eyebrow="Step 4 · Interferometric modulator display" title="A screen that reflects instead of glowing">
          In the late 2000s you chose between LCD/OLED (full colour, power-hungry, unreadable in sun) and e-ink (frugal, readable, slow and
          grey). Qualcomm&apos;s Mirasol used tiny MEMS mirrors: the air gap under each mirror selects a colour, collapsing it shows black.
        </StepHead>
        <Mirasol />
        <Notes
          say="The pixel is bistable. Once a mirror is pulled in, it stays there with no current, so a static page costs nothing to display."
          show="Drag the voltage past 6 V, then back down to 4 V. The mirror stays collapsed until you go below 2.5 V."
        />
      </Step>

      <Step title="Timeline & future">
        <StepHead eyebrow="Step 5 · Research timeline and future possibilities" title="From Hooke's feathers to banknotes, and what comes next">
          Click through 350 years of structural colour, then try two ideas that are still in the lab: a tag that reveals hidden data when
          breathed on, and a seal that records being stretched.
        </StepHead>
        <Future />
        <Connects items={[
          { href: "/vapour-lab", t: "Vapour Lab", s: "Run the vapour sensor yourself and identify a mystery vial." },
          { href: "/tag-forge", t: "Tag Forge", s: "Build a tag with these future features and try to forge it." },
          { href: "/references", t: "Sources", s: "Every number on this page, with its paper." },
        ]} />
      </Step>
    </Steps>
  );
}
