import {
  W, H, Defs, Ground, Column, Pediment, Arch, Book, OpenBook, Scales, Seal, Scroll,
  Envelope, Quill, Lamp, Person, Palm, Hills, Sheet, hatch, hatch2, sky, glow,
} from './kit.jsx';
import S2 from './scenes2.jsx';

// One scene per lesson. Each is a drawing of the thing the lesson is about, in
// the same engraved line-work, and each carries a caption saying what it shows.

const S = {};
const scene = (key, alt, fn) => { S[key] = { alt, fn }; };

// ---------------------------------------------------------------- method
scene('study', 'A study desk at night: a lamp, a stack of texts, and a tray of recall cards.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Lamp x={190} y={92} id={id} />
    <rect x="60" y="300" width={W - 120} height="12" className="pl-fill pl-stroke" />
    <Book x={300} y={272} w={150} h={16} />
    <Book x={310} y={256} w={130} h={16} />
    <Book x={320} y={240} w={112} h={16} />
    <g className="pl-ink">
      {[0, 1, 2].map(i => (
        <rect key={i} x={520 + i * 14} y={244 - i * 5} width="120" height={56} rx="3"
          className="pl-paper pl-stroke" transform={`rotate(${-4 + i * 3} ${580 + i * 14} ${272})`} />
      ))}
    </g>
    <Quill x={488} y={300} s={0.8} />
    <Ground y={312} id={id} />
  </>
));

scene('judgment', 'A bound law report opened at a judgment, with the passage that carries the ratio marked.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <OpenBook cx={400} cy={200} w={460} id={id} />
    <g className="pl-ink">
      <rect x="212" y="176" width="150" height="10" className="pl-accent" opacity="0.35" />
      <rect x="440" y="198" width="120" height="10" className="pl-accent" opacity="0.35" />
    </g>
    <Seal cx={648} cy={300} r={30} label="R" />
    <text x={648} y={344} textAnchor="middle" className="pl-tag">ratio</text>
    <Ground y={330} id={id} />
  </>
));

scene('exam', 'An answer booklet, a clock running against it, and the marks the question is worth.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={120} y={70} w={260} h={250} lines={9} id={id} />
    <g className="pl-ink">
      <circle cx="560" cy="160" r="76" className="pl-fill pl-stroke" />
      <circle cx="560" cy="160" r="66" className="pl-stroke" fill="none" strokeDasharray="2 6" />
      <line x1="560" y1="160" x2="560" y2="108" className="pl-stroke" />
      <line x1="560" y1="160" x2="604" y2="182" className="pl-accent-stroke" />
      <circle cx="560" cy="160" r="5" className="pl-accent-fill" />
    </g>
    <g className="pl-ink">
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={490 + i * 38} y={276} width="28" height={i === 3 ? 18 : 34} className="pl-accent" opacity="0.5" />
      ))}
      <line x1="486" y1="312" x2="646" y2="312" className="pl-stroke" />
    </g>
    <text x={566} y={340} textAnchor="middle" className="pl-tag">time per mark</text>
    <Ground y={330} id={id} />
  </>
));

scene('reasoning', 'A pair of dividers stepping between two cases, measuring how far one reaches.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={90} y={110} w={190} h={150} lines={5} id={id} />
    <Sheet x={520} y={110} w={190} h={150} lines={5} id={id} />
    <g className="pl-ink">
      <path d="M 400 90 L 300 262" className="pl-stroke" />
      <path d="M 400 90 L 500 262" className="pl-stroke" />
      <circle cx="400" cy="88" r="8" className="pl-accent-fill" />
      <path d="M 330 208 A 90 90 0 0 0 470 208" className="pl-accent-stroke" fill="none" strokeDasharray="4 4" />
    </g>
    <text x={400} y={300} textAnchor="middle" className="pl-tag">material difference?</text>
    <Ground y={330} id={id} />
  </>
));

// ---------------------------------------------------------------- foundations
scene('pillars', 'A court facade: public law on one side of the pediment, private law on the other.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Hills y={318} id={id} />
    <Pediment cx={400} y={130} w={420} />
    {[230, 320, 400, 480, 570].map(x => <Column key={x} x={x} y={130} h={168} id={id} />)}
    <rect x="176" y="298" width="448" height="14" className="pl-fill pl-stroke" />
    <text x={296} y={116} textAnchor="middle" className="pl-tag">public</text>
    <text x={504} y={116} textAnchor="middle" className="pl-tag">private</text>
    <Ground y={312} id={id} />
  </>
));

scene('two-benches', 'Two benches on one set of facts: the State prosecuting on the left, a private claim on the right.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="70" y="150" width="290" height="150" className="pl-fill pl-stroke" />
      <rect x="440" y="150" width="290" height="150" className="pl-fill pl-stroke" />
      <rect x="70" y="150" width="290" height="150" fill={hatch(id)} opacity="0.3" />
    </g>
    <Person x={150} y={272} h={78} />
    <Person x={215} y={272} h={78} />
    <Person x={520} y={272} h={78} />
    <Person x={640} y={272} h={78} />
    <text x={215} y={138} textAnchor="middle" className="pl-tag">beyond reasonable doubt</text>
    <text x={585} y={138} textAnchor="middle" className="pl-tag">balance of probabilities</text>
    <Seal cx={400} cy={224} r={30} label="=" />
    <Ground y={312} id={id} />
  </>
));

scene('stairs', 'The hierarchy as a flight of steps: each court bound by the one above it.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    {[0, 1, 2, 3, 4].map(i => (
      <g key={i} className="pl-ink">
        <rect x={90 + i * 122} y={300 - i * 46} width="122" height={46 + i * 46} className="pl-fill pl-stroke" />
        <rect x={90 + i * 122} y={300 - i * 46} width="122" height="46" fill={hatch2(id)} opacity="0.35" />
      </g>
    ))}
    <g className="pl-ink">
      <path d="M 640 92 L 640 62 M 632 72 L 640 60 L 648 72" className="pl-accent-stroke" fill="none" />
    </g>
    <text x={700} y={80} textAnchor="middle" className="pl-tag">binds</text>
    <Ground y={346} id={id} />
  </>
));

scene('lexicon', 'A lexicon open at the maxims, each one a doctrine folded into two words.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <OpenBook cx={400} cy={196} w={440} id={id} />
    <g className="pl-ink">
      {['ultra vires', 'audi alteram', 'nemo judex'].map((t, i) => (
        <text key={t} x={222} y={160 + i * 34} className="pl-latin">{t}</text>
      ))}
      {['actus reus', 'mens rea', 'ratio'].map((t, i) => (
        <text key={t} x={432} y={160 + i * 34} className="pl-latin">{t}</text>
      ))}
    </g>
    <Ground y={330} id={id} />
  </>
));

// ---------------------------------------------------------------- legal system
scene('courthouse', 'A courthouse arcade, the five arches standing for the five courts of the ordinary hierarchy.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Hills y={316} id={id} />
    <g className="pl-ink">
      <rect x="120" y="120" width="560" height="180" className="pl-fill pl-stroke" />
      {[0, 1, 2, 3, 4].map(i => <Arch key={i} x={150 + i * 108} y={168} w={72} h={132} />)}
      <rect x="104" y="104" width="592" height="18" className="pl-fill pl-stroke" />
      <path d="M 400 104 L 340 66 L 460 66 Z" className="pl-fill pl-stroke" />
      <circle cx="400" cy="86" r="9" className="pl-accent-fill" />
    </g>
    <Ground y={300} id={id} />
  </>
));

scene('springs', 'Four streams — Constitution, statute, received common law, custom — feeding one river.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      {[[110, 90], [280, 60], [520, 60], [690, 90]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M ${x} ${y} C ${x + (400 - x) * 0.3} ${y + 90}, ${x + (400 - x) * 0.7} ${y + 130}, 400 250`}
            className="pl-stroke" fill="none" />
          <circle cx={x} cy={y} r="11" className="pl-accent-fill" opacity="0.5" />
        </g>
      ))}
      <path d="M 366 250 C 372 300, 372 330, 366 372 L 434 372 C 428 330, 428 300, 434 250 Z"
        className="pl-fill pl-stroke" />
      <path d="M 366 250 C 372 300, 372 330, 366 372 L 434 372 C 428 330, 428 300, 434 250 Z" fill={hatch(id)} opacity="0.4" />
    </g>
    <text x={110} y={72} textAnchor="middle" className="pl-tag">Constitution</text>
    <text x={280} y={44} textAnchor="middle" className="pl-tag">statute</text>
    <text x={520} y={44} textAnchor="middle" className="pl-tag">common law</text>
    <text x={690} y={72} textAnchor="middle" className="pl-tag">custom</text>
  </>
));

scene('two-domes', 'Two jurisdictions side by side, and the line Article 121(1A) draws between them.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Hills y={318} id={id} />
    <g className="pl-ink">
      <rect x="90" y="170" width="250" height="130" className="pl-fill pl-stroke" />
      <path d="M 90 170 L 215 108 L 340 170 Z" className="pl-fill pl-stroke" />
      {[0, 1, 2].map(i => <Arch key={i} x={116 + i * 78} y={210} w={52} h={90} />)}
      <rect x="460" y="170" width="250" height="130" className="pl-fill pl-stroke" />
      <path d="M 460 170 C 470 108, 700 108, 710 170 Z" className="pl-fill pl-stroke" />
      <line x1="585" y1="108" x2="585" y2="86" className="pl-accent-stroke" />
      <circle cx="585" cy="82" r="5" className="pl-accent-fill" />
      {[0, 1, 2].map(i => <Arch key={i} x={486 + i * 78} y={210} w={52} h={90} />)}
      <line x1="400" y1="70" x2="400" y2="316" className="pl-accent-stroke" strokeDasharray="6 6" />
    </g>
    <text x={215} y={94} textAnchor="middle" className="pl-tag">civil courts</text>
    <text x={585} y={70} textAnchor="middle" className="pl-tag">Syariah courts</text>
    <Ground y={316} id={id} />
  </>
));

// ---------------------------------------------------------------- research
scene('library', 'The reading room, and the one shelf a free portal cannot supply: the citator.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="70" y="70" width="420" height="250" className="pl-fill pl-stroke" />
      {[0, 1, 2, 3].map(r => (
        <g key={r}>
          <line x1="70" y1={132 + r * 62} x2="490" y2={132 + r * 62} className="pl-stroke" />
          {Array.from({ length: 11 }).map((_, i) => (
            <rect key={i} x={82 + i * 36} y={132 + r * 62 - 44 - (i % 3) * 4} width="24"
              height={44 + (i % 3) * 4} className={r === 3 && i > 7 ? 'pl-accent' : 'pl-fill pl-stroke'} />
          ))}
        </g>
      ))}
      <rect x="540" y="120" width="190" height="140" rx="4" className="pl-fill pl-stroke" />
      <rect x="556" y="136" width="158" height="98" className="pl-dark" />
      <rect x="600" y="260" width="70" height="10" className="pl-fill pl-stroke" />
      {[0, 1, 2].map(i => <line key={i} x1="570" y1={158 + i * 22} x2={694 - i * 30} y2={158 + i * 22} className="pl-line-light" />)}
    </g>
    <text x={635} y={294} textAnchor="middle" className="pl-tag">free portal</text>
    <text x={410} y={342} textAnchor="middle" className="pl-tag">citator — paid only</text>
    <Ground y={320} id={id} />
  </>
));

scene('citation', 'A citation taken apart: parties, year, volume, series, page, and the court that decided it.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="70" y="140" width="660" height="76" rx="3" className="pl-paper pl-stroke" />
      <text x={100} y={190} className="pl-cite">Tan Ying Hong v Tan Sian San</text>
      <text x={430} y={190} className="pl-cite is-accent">[2010]</text>
      <text x={498} y={190} className="pl-cite">2 MLJ 1</text>
      <text x={606} y={190} className="pl-cite is-accent">(FC)</text>
      {[[200, 100], [452, 430], [540, 498], [630, 606]].map(([x, from], i) => (
        <path key={i} d={`M ${from + 14} 220 V ${252 + i * 20} H ${x}`} className="pl-line" fill="none" />
      ))}
    </g>
    {[['parties', 200, 252], ['year of the volume', 452, 272], ['volume, series, page', 540, 292], ['the court — never drop it', 630, 312]]
      .map(([t, x, y]) => <text key={t} x={x + 10} y={y + 4} className="pl-tag is-left">{t}</text>)}
    <Ground y={340} id={id} />
  </>
));

// ---------------------------------------------------------------- constitutional
scene('map', 'The Federation: thirteen States and the federal territories, and three lists dividing the power between them.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <path d="M 150 96 C 196 76, 232 104, 240 140 C 250 186, 232 222, 214 260 C 198 296, 176 318, 152 316
               C 128 314, 118 288, 110 258 C 100 220, 106 168, 120 132 C 128 110, 136 102, 150 96 Z"
        className="pl-fill pl-stroke" />
      <path d="M 150 96 C 196 76, 232 104, 240 140 C 250 186, 232 222, 214 260 C 198 296, 176 318, 152 316
               C 128 314, 118 288, 110 258 C 100 220, 106 168, 120 132 C 128 110, 136 102, 150 96 Z"
        fill={hatch(id)} opacity="0.35" />
      <path d="M 330 210 C 380 176, 470 168, 540 186 C 600 200, 646 222, 664 252 C 640 276, 566 288, 500 282
               C 430 276, 366 254, 330 210 Z" className="pl-fill pl-stroke" />
      <path d="M 330 210 C 380 176, 470 168, 540 186 C 600 200, 646 222, 664 252 C 640 276, 566 288, 500 282
               C 430 276, 366 254, 330 210 Z" fill={hatch(id)} opacity="0.35" />
      {[[165, 150], [140, 210], [180, 260], [420, 230], [560, 224], [630, 248]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" className="pl-accent-fill" />
      ))}
    </g>
    <g className="pl-ink">
      {['List I — Federal', 'List II — State', 'List III — Concurrent'].map((t, i) => (
        <g key={t}>
          <rect x="640" y={72 + i * 40} width="130" height="30" rx="3" className="pl-paper pl-stroke" />
          <text x="650" y={92 + i * 40} className="pl-tag is-left">{t}</text>
        </g>
      ))}
    </g>
    <Ground y={330} id={id} />
  </>
));

scene('pillar-cut', 'A pillar of the constitution with the 1988 cut across it, and the argument about what survived.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Column x={400} y={70} h={220} w={70} id={id} />
    <g className="pl-ink">
      <path d="M 356 190 L 448 176" className="pl-accent-stroke" strokeWidth="3" />
      <text x={470} y={186} className="pl-tag is-left">Art 121(1) amended, 1988</text>
      <path d="M 300 118 H 356" className="pl-line" />
      <text x={296} y={122} textAnchor="end" className="pl-tag">judicial power?</text>
      <path d="M 300 262 H 356" className="pl-line" />
      <text x={296} y={266} textAnchor="end" className="pl-tag">basic structure?</text>
    </g>
    <Ground y={300} id={id} />
  </>
));

scene('rostrum', 'A speaker, an audience, and the cordon a restriction draws around them.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="330" y="212" width="140" height="88" className="pl-fill pl-stroke" />
      <rect x="330" y="212" width="140" height="88" fill={hatch2(id)} opacity="0.3" />
    </g>
    <Person x={400} y={212} h={104} />
    {[130, 200, 270, 530, 600, 670].map((x, i) => <Person key={x} x={x} y={300} h={66 + (i % 2) * 8} />)}
    <g className="pl-ink">
      <path d="M 60 250 H 250 M 550 250 H 740" className="pl-accent-stroke" strokeDasharray="8 6" />
      <text x={155} y={238} textAnchor="middle" className="pl-tag">Art 10(2) restriction</text>
    </g>
    <Ground y={312} id={id} />
  </>
));

// ---------------------------------------------------------------- criminal
scene('lamp-blow', 'A brass lamp on a floor: one blow, and the four limbs of section 300 that ask what was intended.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <ellipse cx="300" cy="300" rx="120" ry="18" className="pl-shadow" />
      <path d="M 262 300 L 274 236 L 326 236 L 338 300 Z" className="pl-fill pl-stroke" />
      <ellipse cx="300" cy="236" rx="26" ry="8" className="pl-fill pl-stroke" />
      <path d="M 300 236 L 300 190" className="pl-stroke" />
      <path d="M 268 190 L 332 190 L 322 162 L 278 162 Z" className="pl-fill pl-stroke" />
    </g>
    <g className="pl-ink">
      {['(a) intention to kill', '(b) injury known to be fatal', '(c) injury sufficient in the ordinary course', '(d) imminently dangerous act']
        .map((t, i) => (
          <g key={t}>
            <rect x="470" y={118 + i * 48} width="270" height="36" rx="3"
              className={i === 2 ? 'pl-accent-box' : 'pl-paper pl-stroke'} />
            <text x="484" y={141 + i * 48} className="pl-tag is-left">{t}</text>
          </g>
        ))}
    </g>
    <Ground y={314} id={id} />
  </>
));

scene('shop', 'A shop counter, where the same goods leave by three different routes and become three different offences.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="90" y="210" width="620" height="92" className="pl-fill pl-stroke" />
      <line x1="90" y1="236" x2="710" y2="236" className="pl-line" />
      {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x={110 + i * 100} y={176} width="66" height="34" className="pl-fill pl-stroke" />)}
    </g>
    <g className="pl-ink">
      {[['taken', 'theft', 180], ['entrusted', 'CBT', 400], ['deceived', 'cheating', 620]].map(([a, b, x]) => (
        <g key={b}>
          <path d={`M ${x} 176 V 128`} className="pl-accent-stroke" />
          <text x={x} y={116} textAnchor="middle" className="pl-tag">{a}</text>
          <text x={x} y={96} textAnchor="middle" className="pl-latin">{b}</text>
        </g>
      ))}
    </g>
    <Ground y={302} id={id} />
  </>
));

scene('shield', 'A raised shield: the general exceptions, and the burden the accused carries to stand behind one.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <path d="M 400 78 L 520 118 V 214 C 520 268, 464 306, 400 326 C 336 306, 280 268, 280 214 V 118 Z"
        className="pl-fill pl-stroke" />
      <path d="M 400 78 L 520 118 V 214 C 520 268, 464 306, 400 326 C 336 306, 280 268, 280 214 V 118 Z"
        fill={hatch(id)} opacity="0.3" />
      <line x1="400" y1="88" x2="400" y2="318" className="pl-line" />
      <text x="400" y="176" textAnchor="middle" className="pl-latin">s 105</text>
      <text x="400" y="212" textAnchor="middle" className="pl-tag">on the accused,</text>
      <text x="400" y="232" textAnchor="middle" className="pl-tag">on the balance</text>
    </g>
    <text x={148} y={196} textAnchor="middle" className="pl-tag">ss 76–106</text>
    <text x={652} y={196} textAnchor="middle" className="pl-tag">every offence</text>
    <Ground y={334} id={id} />
  </>
));

scene('lockup', 'A lock-up door and the twenty-four hours Article 5(4) allows before a Magistrate must see the detainee.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="180" y="80" width="240" height="230" className="pl-fill pl-stroke" />
      {[0, 1, 2, 3, 4].map(i => <line key={i} x1={206 + i * 46} y1="98" x2={206 + i * 46} y2="292" className="pl-stroke" strokeWidth="3" />)}
      <line x1="192" y1="192" x2="408" y2="192" className="pl-stroke" strokeWidth="3" />
      <circle cx="440" cy="200" r="9" className="pl-accent-fill" />
    </g>
    <g className="pl-ink">
      <circle cx="600" cy="180" r="80" className="pl-fill pl-stroke" />
      <path d="M 600 180 L 600 116 A 64 64 0 0 1 656 212 Z" className="pl-accent" opacity="0.35" />
      <line x1="600" y1="180" x2="600" y2="116" className="pl-stroke" />
      <line x1="600" y1="180" x2="656" y2="212" className="pl-accent-stroke" />
      <text x="600" y="296" textAnchor="middle" className="pl-tag">24 hours — Art 5(4)</text>
    </g>
    <Ground y={310} id={id} />
  </>
));

scene('bail', 'A ledger and a key: the First Schedule decides which of them the accused is entitled to.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={110} y={96} w={280} h={210} lines={7} id={id} />
    <text x={250} y={82} textAnchor="middle" className="pl-tag">First Schedule</text>
    <g className="pl-ink">
      <circle cx="560" cy="150" r="34" className="pl-stroke" fill="none" strokeWidth="8" />
      <rect x="590" y="142" width="130" height="16" className="pl-fill pl-stroke" />
      <rect x="686" y="158" width="14" height="22" className="pl-fill pl-stroke" />
      <rect x="654" y="158" width="12" height="16" className="pl-fill pl-stroke" />
    </g>
    <g className="pl-ink">
      {[['bailable', 'as of right'], ['non-bailable', 'discretion'], ['death or life', 's 388 restrictions']]
        .map(([a, b], i) => (
          <g key={a}>
            <rect x="470" y={226 + i * 42} width="270" height="34" rx="3" className="pl-paper pl-stroke" />
            <text x="484" y={248 + i * 42} className="pl-tag is-left">{a}</text>
            <text x="726" y={248 + i * 42} textAnchor="end" className="pl-tag">{b}</text>
          </g>
        ))}
    </g>
    <Ground y={360} id={id} />
  </>
));

// ---------------------------------------------------------------- contract
scene('letters', 'Two letters crossing in the post, and the four moments section 4 fixes for them.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Envelope x={90} y={130} w={150} h={96} />
    <Envelope x={560} y={190} w={150} h={96} />
    <g className="pl-ink">
      <path d="M 250 168 C 360 132, 450 200, 552 224" className="pl-accent-stroke" fill="none" strokeDasharray="7 5" />
      <path d="M 552 246 C 450 272, 360 214, 250 200" className="pl-stroke" fill="none" strokeDasharray="7 5" />
      <circle cx="400" cy="176" r="6" className="pl-accent-fill" />
      <circle cx="400" cy="238" r="6" className="pl-fill pl-stroke" />
    </g>
    <text x={400} y={158} textAnchor="middle" className="pl-tag">acceptance — s 4(2)</text>
    <text x={400} y={272} textAnchor="middle" className="pl-tag">revocation — s 4(3)</text>
    <text x={165} y={122} textAnchor="middle" className="pl-tag">acceptor</text>
    <text x={635} y={182} textAnchor="middle" className="pl-tag">proposer</text>
    <Ground y={330} id={id} />
  </>
));

scene('exchange', 'An exchange across a table: what moves, and from whom, under section 2(d).', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink"><rect x="150" y="230" width="500" height="14" className="pl-fill pl-stroke" /></g>
    <Person x={200} y={230} h={112} />
    <Person x={600} y={230} h={112} />
    <Person x={400} y={244} h={80} tone="pl-muted-figure" />
    <g className="pl-ink">
      <path d="M 246 186 H 552" className="pl-accent-stroke" />
      <path d="M 544 178 L 556 186 L 544 194" className="pl-accent-stroke" fill="none" />
      <path d="M 400 190 C 440 176, 500 178, 546 186" className="pl-stroke" strokeDasharray="5 4" fill="none" />
    </g>
    <text x={400} y={166} textAnchor="middle" className="pl-tag">promise</text>
    <text x={400} y={342} textAnchor="middle" className="pl-tag">“or any other person” — s 2(d)</text>
    <Ground y={324} id={id} />
  </>
));

scene('broken-seal', 'A deed with its seal broken: the agreement stands until the party entitled to avoid it says otherwise.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={230} y={70} w={340} h={250} lines={8} id={id} />
    <g className="pl-ink">
      <circle cx="400" cy="290" r="34" className="pl-accent-fill" opacity="0.22" />
      <circle cx="400" cy="290" r="34" className="pl-accent-stroke" fill="none" />
      <path d="M 384 262 L 402 292 L 386 318" className="pl-stroke" fill="none" strokeWidth="2.5" />
    </g>
    <g className="pl-ink">
      {['coercion', 'undue influence', 'fraud', 'misrepresentation', 'mistake'].map((t, i) => (
        <text key={t} x={640} y={120 + i * 34} className="pl-tag is-left">{t}</text>
      ))}
      <line x1="614" y1="102" x2="614" y2="266" className="pl-accent-stroke" />
      <text x={608} y={92} textAnchor="end" className="pl-tag">s 14</text>
    </g>
    <Ground y={334} id={id} />
  </>
));

scene('ledger', 'A ledger, a clause and a scale: what the breach actually cost, against what the contract said it would.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={70} y={110} w={230} h={190} lines={6} id={id} />
    <text x={185} y={98} textAnchor="middle" className="pl-tag">clause 11</text>
    <Scales cx={520} cy={190} s={1.25} tilt={-9} />
    <text x={430} y={294} textAnchor="middle" className="pl-tag">sum named</text>
    <text x={618} y={276} textAnchor="middle" className="pl-tag">loss proved</text>
    <Ground y={330} id={id} />
  </>
));

// ---------------------------------------------------------------- tort
scene('scaffold', 'Scaffolding over a five-foot way, with the toe board that was not fitted.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="120" y="60" width="560" height="240" className="pl-fill pl-stroke" opacity="0.5" />
      {[0, 1, 2].map(r => <line key={r} x1="120" y1={130 + r * 62} x2="680" y2={130 + r * 62} className="pl-stroke" strokeWidth="3" />)}
      {[0, 1, 2, 3, 4].map(c => <line key={c} x1={160 + c * 130} y1="60" x2={160 + c * 130} y2="300" className="pl-stroke" strokeWidth="3" />)}
      <rect x="120" y="120" width="300" height="10" className="pl-accent" />
      <rect x="440" y="120" width="240" height="10" className="pl-fill pl-stroke" strokeDasharray="6 5" />
      <text x={560} y={112} textAnchor="middle" className="pl-tag">toe board absent</text>
      <circle cx="560" cy="196" r="10" className="pl-accent-fill" />
      <path d="M 560 206 L 556 260" className="pl-accent-stroke" strokeDasharray="4 4" />
    </g>
    <Person x={556} y={310} h={72} />
    <Ground y={310} id={id} />
  </>
));

scene('chain', 'A chain of causation, and the link a later act may break.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      {[0, 1, 2, 3, 4].map(i => (
        <ellipse key={i} cx={150 + i * 125} cy="190" rx="52" ry="30" fill="none"
          className={i === 3 ? 'pl-accent-stroke' : 'pl-stroke'} strokeWidth="7"
          strokeDasharray={i === 3 ? '10 8' : undefined} />
      ))}
      <path d="M 590 130 L 662 250 M 662 130 L 590 250" className="pl-accent-stroke" strokeWidth="3" />
    </g>
    {[['breach', 150], ['injury', 275], ['treatment', 400], ['worse injury', 525], ['loss', 650]].map(([t, x]) => (
      <text key={t} x={x} y="268" textAnchor="middle" className="pl-tag">{t}</text>
    ))}
    <text x={626} y={306} textAnchor="middle" className="pl-tag">novus actus?</text>
    <Ground y={330} id={id} />
  </>
));

scene('press', 'A press at work: the moment of publication, which is where the tort begins.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="180" y="90" width="300" height="200" className="pl-fill pl-stroke" />
      <rect x="204" y="118" width="252" height="120" className="pl-dark" />
      <rect x="150" y="290" width="360" height="18" className="pl-fill pl-stroke" />
      <path d="M 330 90 V 60 H 430" className="pl-stroke" />
      <circle cx="430" cy="60" r="18" className="pl-fill pl-stroke" />
    </g>
    <g className="pl-ink">
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={540 + i * 12} y={150 + i * 16} width="150" height="110"
          className="pl-paper pl-stroke" transform={`rotate(${-6 + i * 3} ${615} ${205})`} />
      ))}
    </g>
    <text x={630} y={306} textAnchor="middle" className="pl-tag">published to one other person</text>
    <Ground y={308} id={id} />
  </>
));

// ---------------------------------------------------------------- land
scene('register', 'The register: not a record of a title acquired elsewhere, but the thing that creates it.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <OpenBook cx={360} cy={196} w={430} id={id} />
    <g className="pl-ink">
      <rect x="196" y="150" width="130" height="12" className="pl-accent" opacity="0.4" />
      <rect x="400" y="150" width="130" height="12" className="pl-accent" opacity="0.4" />
    </g>
    <Seal cx={640} cy={252} r={34} label="✓" />
    <text x={640} y={306} textAnchor="middle" className="pl-tag">registration</text>
    <text x={360} y={330} textAnchor="middle" className="pl-tag">title by registration, not registration of title</text>
    <Ground y={344} id={id} />
  </>
));

scene('caveat', 'A caveat struck across a register page: dealings frozen while the claim is worked out.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={210} y={64} w={380} h={260} lines={9} id={id} />
    <g className="pl-ink" transform="rotate(-12 400 200)">
      <rect x="250" y="164" width="300" height="72" rx="4" className="pl-accent-stroke" fill="none" strokeWidth="4" />
      <text x="400" y="212" textAnchor="middle" className="pl-stamp">CAVEAT</text>
    </g>
    <text x={400} y={352} textAnchor="middle" className="pl-tag">a freeze, not an interest</text>
    <Ground y={336} id={id} />
  </>
));

// ---------------------------------------------------------------- company
scene('company-seal', 'A company seal and a share certificate: one person in law, distinct from the people who own it.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={90} y={90} w={330} h={220} lines={6} id={id} />
    <Seal cx={360} cy={280} r={40} label="Co" />
    <g className="pl-ink">
      <circle cx="600" cy="130" r="34" className="pl-fill pl-stroke" />
      <text x="600" y="138" textAnchor="middle" className="pl-latin">Co</text>
      {[[520, 250], [600, 268], [680, 250]].map(([x, y], i) => (
        <g key={i}>
          <line x1="600" y1="166" x2={x} y2={y - 24} className="pl-line" />
          <circle cx={x} cy={y} r="20" className="pl-fill pl-stroke" />
        </g>
      ))}
    </g>
    <text x={600} y={318} textAnchor="middle" className="pl-tag">members — not liable by membership alone</text>
    <Ground y={334} id={id} />
  </>
));

// ---------------------------------------------------------------- evidence
scene('gate', 'A gate with a keeper: nothing is admitted because it is interesting, only because a section lets it in.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="300" y="80" width="200" height="230" className="pl-fill pl-stroke" />
      <path d="M 300 80 A 100 100 0 0 1 500 80" className="pl-fill pl-stroke" />
      {[0, 1, 2].map(i => <line key={i} x1={340 + i * 60} y1="40" x2={340 + i * 60} y2="310" className="pl-stroke" strokeWidth="3" />)}
      <text x="400" y="200" textAnchor="middle" className="pl-latin">s 5</text>
    </g>
    <g className="pl-ink">
      {[130, 190, 250].map((y, i) => (
        <g key={y}>
          <rect x="80" y={y} width="150" height="42" rx="3" className="pl-paper pl-stroke" />
          <path d={`M 236 ${y + 21} H ${i === 1 ? 292 : 268}`} className={i === 1 ? 'pl-accent-stroke' : 'pl-line'} />
          {i !== 1 && <path d={`M 262 ${y + 14} L 276 ${y + 28} M 276 ${y + 14} L 262 ${y + 28}`} className="pl-stroke" />}
        </g>
      ))}
      <rect x="560" y={190} width="150" height="42" rx="3" className="pl-paper pl-stroke" />
    </g>
    <text x={155} y={312} textAnchor="middle" className="pl-tag">probative</text>
    <text x={635} y={258} textAnchor="middle" className="pl-tag">admissible</text>
    <Ground y={318} id={id} />
  </>
));

scene('balance', 'The two standards on one beam: what the prosecution carries, and what a plaintiff does.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Scales cx={400} cy={180} s={1.7} tilt={5} />
    <text x={295} y={330} textAnchor="middle" className="pl-tag">balance of probabilities</text>
    <text x={505} y={330} textAnchor="middle" className="pl-tag">beyond reasonable doubt</text>
    <Ground y={344} id={id} />
  </>
));

// ---------------------------------------------------------------- procedure
scene('files', 'Bundles on a registry shelf: most of them will never reach a trial.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i}>
          <rect x={90 + i * 70} y={140 + (i % 3) * 8} width="54" height={160 - (i % 3) * 8}
            className={i > 6 ? 'pl-accent' : 'pl-fill pl-stroke'} />
          <line x1={90 + i * 70} y1={168 + (i % 3) * 8} x2={144 + i * 70} y2={168 + (i % 3) * 8} className="pl-line" />
        </g>
      ))}
      <rect x="70" y="300" width="660" height="14" className="pl-fill pl-stroke" />
    </g>
    <text x={400} y={350} textAnchor="middle" className="pl-tag">O 14 · O 18 r 19 · O 29 — where most of them end</text>
    <Ground y={314} id={id} />
  </>
));

scene('halt', 'A raised hand stopping the works: interim relief holds the position until trial.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="440" y="150" width="280" height="150" className="pl-fill pl-stroke" />
      <rect x="440" y="150" width="280" height="150" fill={hatch2(id)} opacity="0.35" />
      <circle cx="520" cy="226" r="34" className="pl-stroke" fill="none" strokeWidth="5" />
      <circle cx="640" cy="226" r="34" className="pl-stroke" fill="none" strokeWidth="5" />
    </g>
    <g className="pl-ink">
      <path d="M 250 300 V 200 C 250 178, 282 178, 282 200 V 160 C 282 138, 314 138, 314 160 V 200
               C 314 172, 346 172, 346 196 V 300 Z" className="pl-fill pl-stroke" />
      <circle cx="298" cy="236" r="86" className="pl-accent-stroke" fill="none" strokeDasharray="6 8" />
    </g>
    <text x={298} y={348} textAnchor="middle" className="pl-tag">serious question · damages inadequate · balance</text>
    <Ground y={310} id={id} />
  </>
));

// ---------------------------------------------------------------- administrative
scene('empty-chair', 'A hearing with one chair empty: the decision was taken without hearing the person it affected.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="140" y="238" width="520" height="16" className="pl-fill pl-stroke" />
    </g>
    <Person x={230} y={238} h={100} />
    <Person x={330} y={238} h={100} />
    <Person x={430} y={238} h={100} />
    <g className="pl-ink">
      <rect x="540" y="188" width="52" height="8" className="pl-stroke" fill="none" strokeDasharray="5 4" />
      <line x1="546" y1="196" x2="546" y2="238" className="pl-stroke" strokeDasharray="5 4" />
      <line x1="586" y1="196" x2="586" y2="238" className="pl-stroke" strokeDasharray="5 4" />
      <rect x="536" y="120" width="60" height="70" rx="3" className="pl-accent-stroke" fill="none" strokeDasharray="5 4" />
    </g>
    <text x={566} y={288} textAnchor="middle" className="pl-tag">audi alteram partem</text>
    <Ground y={306} id={id} />
  </>
));

// ---------------------------------------------------------------- interpretation
scene('statute-page', 'A section under a glass: the words first, then the purpose that chooses between their readings.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={140} y={60} w={400} h={270} lines={9} id={id} />
    <g className="pl-ink">
      <circle cx="520" cy="180" r="88" className="pl-glass" />
      <circle cx="520" cy="180" r="88" className="pl-stroke" fill="none" strokeWidth="6" />
      <line x1="582" y1="244" x2="672" y2="330" className="pl-stroke" strokeWidth="10" strokeLinecap="round" />
      <text x="520" y="176" textAnchor="middle" className="pl-latin">“other</text>
      <text x="520" y="206" textAnchor="middle" className="pl-latin">vehicle”</text>
    </g>
    <text x={340} y={358} textAnchor="middle" className="pl-tag">s 17A — purpose chooses between readings the words can bear</text>
  </>
));

scene('aids', 'The aids on the drafter’s desk: long title, definitions, marginal notes, provisos, schedules.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      {['long title', 'definitions', 'marginal notes', 'provisos', 'schedules'].map((t, i) => (
        <g key={t}>
          <rect x={70 + (i % 3) * 230} y={90 + Math.floor(i / 3) * 120} width="200" height="94" rx="3"
            className="pl-paper pl-stroke" />
          <text x={170 + (i % 3) * 230} y={128 + Math.floor(i / 3) * 120} textAnchor="middle" className="pl-latin">{t}</text>
          {[0, 1, 2].map(k => (
            <line key={k} x1={86 + (i % 3) * 230} y1={144 + k * 12 + Math.floor(i / 3) * 120}
              x2={254 + (i % 3) * 230 - (k === 2 ? 50 : 0)} y2={144 + k * 12 + Math.floor(i / 3) * 120} className="pl-line" />
          ))}
        </g>
      ))}
    </g>
    <Seal cx={640} cy={264} r={40} label="17A" />
    <Ground y={344} id={id} />
  </>
));

// ---------------------------------------------------------------- fallback
scene('statute', 'A statute reprint, ruled and sealed — the form every lesson in this app is set in.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={230} y={60} w={340} h={270} lines={9} id={id} />
    <Seal cx={400} cy={300} r={32} label="§" />
    <Ground y={344} id={id} />
  </>
));

// The second set is merged in here rather than registered separately, so
// `SCENE_KEYS` stays the single answer to "what scenes exist" — which is what
// the content check reads to catch a lesson naming a plate nobody drew.
Object.assign(S, S2);

export default S;
export const SCENE_KEYS = Object.keys(S);
