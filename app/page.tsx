import Link from "next/link";
import HeroMorpho from "@/components/HeroMorpho";
import StartStory from "@/components/StartStory";
import Thumb from "@/components/Thumb";
import "./home.css";

const MACHINES = [
  ["/anti-counterfeit", "Security tag", "Your hand tilting it", "Path difference changes with angle", "Colour shift, motion, depth", "Human eye"],
  ["/vapour-lab", "Vapour sensor", "Gas condensing between lamellae", "Gap refractive index rises", "Spectral fingerprint ΔR", "Spectrometer + PCA"],
  ["/beyond#step-2", "MorphoTex fibre", "Nothing: fixed at manufacture", "61 layers of 70 nm polymer", "Colour without dye", "Human eye"],
];

export default function Home() {
  return (
    <main>
      <div className="wrap hero">
        <div>
          <p className="eyebrow">Bio-inspired security &amp; anti-counterfeiting</p>
          <h1>Colour that<br /><em className="iri">can&apos;t be printed.</em></h1>
          <p className="lede">
            The Blue Morpho has no blue pigment. Its blue is daylight sorted by stacks of chitin shelves, each about 75&nbsp;nanometres thick.
            Tilt the wing and the colour moves. Wet it and the colour changes. A printer cannot copy that, and it is the idea behind the
            security features on modern banknotes.
          </p>
          <div className="cta">
            <StartStory />
            <Link className="btn" href="/structural-colour">Chapter 1 &rarr;</Link>
            <Link className="btn ghost" href="/wing-lab">Open the Wing Lab</Link>
          </div>
        </div>
        <HeroMorpho />
      </div>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 8 }}><p className="eyebrow">The problem</p><h2>Counterfeiting is a trade, not a prank</h2></div>
          <p className="lede">Holograms, watermarks and special inks give the same answer every time you check them. Anything predictable can be learned and copied.</p>
        </div>
        <div className="problem">
          <div><b className="num">$470B</b><span>global trade in counterfeit goods each year</span><small>OECD &amp; EUIPO</small></div>
          <div><b className="num">2.3%</b><span>of everything the world imports is fake</span><small>OECD &amp; EUIPO</small></div>
          <div><b className="num">1 in 10</b><span>medicines in low and middle income countries is substandard or falsified</span><small>WHO</small></div>
          <div><b className="num" style={{ color: "var(--morpho)" }}>0%</b><span>colour loss in a biomimetic tag after 1000 hours of UV. Dye loses over half in 100&ndash;300 hours.</span><small>PMC7560414</small></div>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 8 }}><p className="eyebrow">Chapters &middot; read in order</p><h2>From a wing to a banknote</h2></div>
          <p className="lede">Each chapter is a stepped model built for presenting. Arrow keys move between steps and P shows speaker notes.</p>
        </div>
        <div className="chapters">
          <Link className="chap" href="/structural-colour"><Thumb kind="stack" /><div className="body"><span className="k">CHAPTER 01</span><h3>Structural colour</h3><p>Zoom from wing to lamella, add reflected waves by hand, then tune a real multilayer and see the colour it makes.</p><div className="tags"><span className="chip">interference</span><span className="chip">iridescence</span><span className="chip">diffraction</span></div></div></Link>
          <Link className="chap" href="/anti-counterfeit"><Thumb kind="tag" /><div className="body"><span className="k">CHAPTER 02</span><h3>Anti-counterfeiting</h3><p>A KolourOptik-style stripe you can tilt and forge, a microscope that out-resolves any printer, and what a tag costs.</p><div className="tags"><span className="chip">security tags</span><span className="chip">resolution</span><span className="chip">cost</span></div></div></Link>
          <Link className="chap" href="/beyond"><Thumb kind="beyond" /><div className="body"><span className="k">CHAPTER 03</span><h3>Beyond the banknote</h3><p>A real Morpho wing that picks out a nerve-agent simulant at 30&nbsp;ppm in a mixture, and a fibre coloured with no dye.</p><div className="tags"><span className="chip">vapour</span><span className="chip">MorphoTex</span></div></div></Link>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head"><div className="stack" style={{ gap: 8 }}><p className="eyebrow">Playgrounds &middot; open any time</p><h2>Hands on the physics</h2></div></div>
        <div className="labs">
          <Link className="lab" href="/wing-lab"><Thumb kind="wing" /><div><span className="k">L1 &middot; 3D</span><h3>Wing Lab</h3><p>Fly a Morpho in 3D. Flood its scales with alcohol, change the shelf spacing, then dive 100,000&times; down to one lamella and watch photons sort themselves.</p></div></Link>
          <Link className="lab" href="/vapour-lab"><Thumb kind="vapour" /><div><span className="k">L2 &middot; sensor</span><h3>Vapour Lab</h3><p>Pipe DMMP, a nerve-agent simulant, over a wing. Read its spectral fingerprint, run PCA live, coat the wing and watch the selectivity vanish.</p></div></Link>
        </div>
      </section>

      <section className="band wrap">
        <div className="band-head">
          <div className="stack" style={{ gap: 8 }}><p className="eyebrow">One idea, three machines</p><h2>Nanostructure &rarr; light &rarr; signal</h2></div>
          <p className="lede">Every application in this lab is the same chain. What changes is the thing that disturbs the shelves and the thing that reads the colour.</p>
        </div>
        <div className="machine"><div className="wrapx"><div className="inner">
          <div className="rowh"><div>Application</div><div>What disturbs the shelves</div><div>Light interaction</div><div>Optical effect</div><div>Read by</div></div>
          {MACHINES.map(([href, ...cells]) => (
            <div className="r" key={href}>
              <div><Link href={href}>{cells[0]}</Link></div>
              {cells.slice(1).map((c) => <div key={c}>{c}</div>)}
            </div>
          ))}
        </div></div></div>
      </section>
    </main>
  );
}
