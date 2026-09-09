import {
  W, H, Ground, Column, Arch, Book, OpenBook, Scales, Seal, Scroll,
  Envelope, Quill, Lamp, Person, Palm, Hills, Sheet, hatch, hatch2, sky, glow,
} from './kit.jsx';

// The second plate set: one scene for each of the on-ramp lessons and for the
// topics the first set did not reach. Same vocabulary, same frame.

const S2 = {};
const scene = (key, alt, fn) => { S2[key] = { alt, fn }; };

scene('lone-desk', 'A kitchen table after work: one lamp, one book, and the hour that is actually available.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="90" y="266" width={W - 180} height="14" className="pl-fill pl-stroke" />
      <line x1="140" y1="280" x2="128" y2="360" className="pl-stroke" />
      <line x1="660" y1="280" x2="672" y2="360" className="pl-stroke" />
    </g>
    <Lamp x={200} y={110} id={id} />
    <OpenBook cx={470} cy={228} w={230} id={id} />
    <Person x={640} y={266} h={130} />
    <g className="pl-ink">
      <rect x="300" y="238" width="62" height="28" rx="3" className="pl-paper pl-stroke" />
      <text x="331" y="257" textAnchor="middle" className="pl-tag">20:30</text>
    </g>
    <Ground y={360} id={id} />
  </>
));

scene('phone-portal', 'A phone showing the free statute portal, and the one thing it will not tell you.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="292" y="52" width="216" height="300" rx="18" className="pl-fill pl-stroke" />
      <rect x="308" y="86" width="184" height="232" className="pl-paper pl-stroke" />
      <rect x="366" y="64" width="68" height="8" rx="4" className="pl-dark" />
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <line key={i} x1="324" y1={110 + i * 26} x2={476 - (i % 3) * 34} y2={110 + i * 26} className="pl-line" />
      ))}
      <rect x="324" y="110" width="120" height="12" className="pl-accent" opacity="0.4" />
    </g>
    <g className="pl-ink">
      <rect x="556" y="120" width="196" height="60" rx="3" className="pl-paper pl-stroke" />
      <text x="654" y="146" textAnchor="middle" className="pl-tag">text of the Act</text>
      <text x="654" y="166" textAnchor="middle" className="pl-tag">free</text>
      <rect x="556" y="200" width="196" height="60" rx="3" className="pl-stroke" fill="none" strokeDasharray="6 5" />
      <text x="654" y="226" textAnchor="middle" className="pl-tag">still good law?</text>
      <text x="654" y="246" textAnchor="middle" className="pl-tag">not free</text>
    </g>
    <Ground y={352} id={id} />
  </>
));

scene('ladder-argument', 'An argument built one rung at a time: facts, issue, rule, application, answer.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <line x1="250" y1="360" x2="330" y2="50" className="pl-stroke" strokeWidth="3" />
      <line x1="470" y1="360" x2="390" y2="50" className="pl-stroke" strokeWidth="3" />
      {[0, 1, 2, 3, 4].map(i => {
        const y = 330 - i * 66;
        const inset = i * 8;
        return (
          <g key={i}>
            <line x1={254 + inset} y1={y} x2={466 - inset} y2={y} className="pl-stroke" strokeWidth="3" />
            <text x={500} y={y + 5} className="pl-tag is-left">
              {['facts', 'issue', 'rule', 'application', 'answer'][i]}
            </text>
          </g>
        );
      })}
    </g>
    <Ground y={360} id={id} />
  </>
));

scene('section-anatomy', 'A single section cut at its joints: the actor, the act, the conditions, the exception.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={80} y={70} w={640} h={110} lines={3} id={id} />
    <g className="pl-ink">
      {[['who', 130], ['does what', 300], ['when', 470], ['unless', 620]].map(([t, x], i) => (
        <g key={t}>
          <line x1={x} y1={182} x2={x} y2={228} className="pl-accent-stroke" strokeDasharray="4 4" />
          <rect x={x - 68} y={228} width="136" height="54" rx="3"
            className={i === 3 ? 'pl-accent-box' : 'pl-paper pl-stroke'} />
          <text x={x} y={260} textAnchor="middle" className="pl-latin">{t}</text>
        </g>
      ))}
    </g>
    <Ground y={330} id={id} />
  </>
));

scene('roadside', 'A roadside stop: being stopped, being asked, and being arrested are three different things.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Hills y={300} id={id} />
    <g className="pl-ink">
      <rect x="60" y="300" width={W - 120} height="10" className="pl-fill pl-stroke" />
      {[0, 1, 2, 3, 4].map(i => <rect key={i} x={110 + i * 140} y={318} width="60" height="6" className="pl-line-light" />)}
      <rect x="470" y="214" width="180" height="86" rx="8" className="pl-fill pl-stroke" />
      <rect x="496" y="182" width="120" height="40" rx="8" className="pl-fill pl-stroke" />
      <circle cx="512" cy="304" r="18" className="pl-fill pl-stroke" />
      <circle cx="614" cy="304" r="18" className="pl-fill pl-stroke" />
      <rect x="524" y="170" width="64" height="12" rx="4" className="pl-accent" />
    </g>
    <Person x={250} y={300} h={110} />
    <Person x={340} y={300} h={110} />
    <g className="pl-ink">
      {['stopped', 'asked', 'arrested'].map((t, i) => (
        <g key={t}>
          <rect x={80 + i * 118} y={70} width="106" height="34" rx="17"
            className={i === 2 ? 'pl-accent-box' : 'pl-paper pl-stroke'} />
          <text x={133 + i * 118} y={92} textAnchor="middle" className="pl-tag">{t}</text>
          {i < 2 && <line x1={190 + i * 118} y1={87} x2={196 + i * 118} y2={87} className="pl-line" />}
        </g>
      ))}
    </g>
    <Ground y={310} id={id} />
  </>
));

scene('dock', 'The first appearance: a charge read out, and a decision about liberty before any trial.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="240" y="90" width="320" height="30" className="pl-fill pl-stroke" />
      <rect x="270" y="120" width="260" height="90" className="pl-fill pl-stroke" />
      <rect x="270" y="120" width="260" height="90" fill={hatch2(id)} opacity="0.28" />
    </g>
    <Person x={400} y={120} h={96} />
    <g className="pl-ink">
      <rect x="90" y="248" width="180" height="62" className="pl-fill pl-stroke" />
      <rect x="530" y="248" width="180" height="62" className="pl-fill pl-stroke" />
    </g>
    <Person x={180} y={248} h={78} />
    <Person x={620} y={248} h={78} />
    <text x={180} y={334} textAnchor="middle" className="pl-tag">prosecution</text>
    <text x={620} y={334} textAnchor="middle" className="pl-tag">defence</text>
    <text x={400} y={78} textAnchor="middle" className="pl-tag">the charge, read out</text>
    <Ground y={318} id={id} />
  </>
));

scene('land-search', 'A land search: the answer to “who owns this” is a document, not a person’s word.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <path d="M 90 300 L 300 240 L 300 340 L 90 360 Z" className="pl-fill pl-stroke" />
      <path d="M 90 300 L 300 240 L 300 340 L 90 360 Z" fill={hatch(id)} opacity="0.35" />
      {[0, 1, 2].map(i => <line key={i} x1={140 + i * 56} y1={288 - i * 16} x2={140 + i * 56} y2={352 - i * 6} className="pl-line" />)}
    </g>
    <Sheet x={380} y={80} w={330} h={230} lines={7} id={id} />
    <g className="pl-ink">
      <rect x="400" y="104" width="180" height="14" className="pl-accent" opacity="0.45" />
      <text x="400" y="140" className="pl-tag is-left">proprietor</text>
      <text x="400" y="176" className="pl-tag is-left">charge — a bank</text>
      <text x="400" y="212" className="pl-tag is-left">caveat — someone claiming</text>
    </g>
    <Ground y={360} id={id} />
  </>
));

scene('four-papers', 'Four papers, four jobs: the title, the transfer, the charge and the caveat.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    {[['title', 60], ['transfer', 250], ['charge', 440], ['caveat', 630]].map(([t, x], i) => (
      <g key={t}>
        <Sheet x={x} y={90 + (i % 2) * 18} w={140} h={180} lines={5} id={id} />
        <text x={x + 70} y={300 + (i % 2) * 18} textAnchor="middle" className="pl-latin">{t}</text>
      </g>
    ))}
    <Seal cx={130} cy={250} r={22} label="§" />
    <Ground y={344} id={id} />
  </>
));

scene('debt-wall', 'A debt stops at the company: the wall between what it owes and what its owners own.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="382" y="60" width="36" height="290" className="pl-fill pl-stroke" />
      <rect x="382" y="60" width="36" height="290" fill={hatch(id)} opacity="0.4" />
      <circle cx="240" cy="150" r="40" className="pl-fill pl-stroke" />
      <text x="240" y="158" textAnchor="middle" className="pl-latin">Co</text>
      <path d="M 150 240 H 366" className="pl-accent-stroke" />
      <path d="M 358 232 L 370 240 L 358 248" className="pl-accent-stroke" fill="none" />
      <path d="M 430 240 H 560" className="pl-stroke" strokeDasharray="6 5" />
      <path d="M 552 232 L 564 240 L 552 248" className="pl-stroke" fill="none" />
      <path d="M 470 214 L 522 266 M 522 214 L 470 266" className="pl-accent-stroke" strokeWidth="3" />
    </g>
    <Person x={640} y={300} h={100} />
    <text x={240} y={230} textAnchor="middle" className="pl-tag">the debt is the company's</text>
    <text x={640} y={330} textAnchor="middle" className="pl-tag">the member</text>
    <Ground y={350} id={id} />
  </>
));

scene('boardroom', 'Who owns, who runs, and the meeting where the two meet.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <ellipse cx="400" cy="238" rx="230" ry="66" className="pl-fill pl-stroke" />
      <ellipse cx="400" cy="238" rx="230" ry="66" fill={hatch2(id)} opacity="0.25" />
    </g>
    {[[220, 190], [400, 176], [580, 190]].map(([x, y], i) => <Person key={i} x={x} y={y} h={86} />)}
    {[[250, 320], [400, 330], [550, 320]].map(([x, y], i) => <Person key={i} x={x} y={y} h={74} tone="pl-muted-figure" />)}
    <text x={400} y={116} textAnchor="middle" className="pl-tag">directors — who run it</text>
    <text x={400} y={356} textAnchor="middle" className="pl-tag">members — who own it</text>
    <Ground y={362} id={id} />
  </>
));

scene('earshot', 'What a court may listen to: some of what is said reaches the bench, and some does not.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="560" y="180" width="180" height="120" className="pl-fill pl-stroke" />
      <path d="M 560 180 L 650 130 L 740 180 Z" className="pl-fill pl-stroke" />
    </g>
    <Person x={650} y={300} h={92} />
    <g className="pl-ink">
      {[110, 190, 270].map((y, i) => (
        <g key={y}>
          <ellipse cx="150" cy={y} rx="76" ry="30" className="pl-paper pl-stroke" />
          <text x="150" y={y + 5} textAnchor="middle" className="pl-tag">
            {['what was seen', 'what was heard', 'what was guessed'][i]}
          </text>
          {i < 2
            ? <path d={`M 230 ${y} C 340 ${y}, 420 ${y + (1 - i) * 40}, 546 ${230}`} className="pl-accent-stroke" fill="none" />
            : <>
                <path d={`M 230 ${y} C 320 ${y}, 380 ${y}, 430 ${y}`} className="pl-stroke" strokeDasharray="5 5" fill="none" />
                <path d="M 442 258 L 478 294 M 478 258 L 442 294" className="pl-stroke" strokeWidth="2.5" />
              </>}
        </g>
      ))}
    </g>
    <Ground y={340} id={id} />
  </>
));

scene('who-proves', 'Who has to prove it, and how sure the judge must be before saying yes.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Person x={170} y={280} h={110} />
    <Person x={630} y={280} h={110} />
    <g className="pl-ink">
      <rect x="120" y="300" width="100" height="14" className="pl-accent" />
      <rect x="580" y="300" width="100" height="14" className="pl-fill pl-stroke" strokeDasharray="5 4" />
      <path d="M 300 200 H 500" className="pl-stroke" strokeWidth="3" />
      <path d="M 490 192 L 502 200 L 490 208" className="pl-stroke" fill="none" />
      <circle cx="400" cy="128" r="46" className="pl-fill pl-stroke" />
      <path d="M 400 128 L 400 90 A 38 38 0 0 1 434 148 Z" className="pl-accent" opacity="0.4" />
    </g>
    <text x={170} y={340} textAnchor="middle" className="pl-tag">asserts</text>
    <text x={630} y={340} textAnchor="middle" className="pl-tag">need not disprove</text>
    <text x={400} y={192} textAnchor="middle" className="pl-tag">how sure?</text>
    <Ground y={330} id={id} />
  </>
));

scene('letter-of-demand', 'Before any court: a letter, a date, and the last chance to settle without one.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={110} y={70} w={280} h={240} lines={7} id={id} />
    <text x={250} y={340} textAnchor="middle" className="pl-tag">letter of demand</text>
    <g className="pl-ink">
      <path d="M 410 190 H 500" className="pl-accent-stroke" />
      <path d="M 492 182 L 504 190 L 492 198" className="pl-accent-stroke" fill="none" />
    </g>
    <g className="pl-ink">
      <rect x="530" y="90" width="200" height="200" className="pl-fill pl-stroke" />
      <path d="M 530 90 L 630 40 L 730 90 Z" className="pl-fill pl-stroke" />
      <Arch x={588} y={150} w={84} h={140} />
    </g>
    <text x={630} y={330} textAnchor="middle" className="pl-tag">only if it fails</text>
    <Ground y={314} id={id} />
  </>
));

scene('road-to-judgment', 'From papers to judgment, and the further road from judgment to being paid.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <path d="M 60 300 C 220 300, 260 160, 420 160 C 580 160, 620 250, 740 250" className="pl-stroke" strokeWidth="3" fill="none" />
      {[[60, 300, 'papers'], [240, 236, 'trial'], [420, 160, 'judgment'], [600, 196, 'enforce'], [740, 250, 'paid']].map(([x, y, t], i) => (
        <g key={t}>
          <circle cx={x} cy={y} r={i === 4 ? 12 : 9} className={i === 4 ? 'pl-accent-fill' : 'pl-fill pl-stroke'} />
          <text x={x} y={y - 22} textAnchor="middle" className="pl-tag">{t}</text>
        </g>
      ))}
      <path d="M 420 178 V 300" className="pl-stroke" strokeDasharray="5 5" />
      <text x={420} y={324} textAnchor="middle" className="pl-tag">most stop here</text>
    </g>
    <Ground y={350} id={id} />
  </>
));

scene('charge-sheet', 'The charge: what is alleged, in enough detail to be answered.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <Sheet x={200} y={54} w={400} h={280} lines={8} id={id} />
    <g className="pl-ink">
      <rect x="226" y="80" width="220" height="16" className="pl-accent" opacity="0.45" />
      {[['when', 140], ['where', 186], ['who', 232], ['what section', 278]].map(([t, y]) => (
        <g key={t}>
          <circle cx="216" cy={y} r="5" className="pl-accent-fill" />
          <text x={620} y={y + 5} className="pl-tag is-left">{t}</text>
          <line x1="600" y1={y} x2="576" y2={y} className="pl-line" />
        </g>
      ))}
    </g>
    <Ground y={352} id={id} />
  </>
));

scene('veil', 'The veil, and the narrow grounds on which a court will look behind it.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <path d="M 200 70 C 300 40, 500 40, 600 70 L 600 330 C 500 300, 300 300, 200 330 Z"
        className="pl-fill pl-stroke" />
      <path d="M 200 70 C 300 40, 500 40, 600 70 L 600 330 C 500 300, 300 300, 200 330 Z"
        fill={hatch(id)} opacity="0.4" />
      <path d="M 400 60 V 340" className="pl-accent-stroke" strokeDasharray="8 6" />
      <circle cx="330" cy="200" r="34" className="pl-fill pl-stroke" />
      <text x="330" y="208" textAnchor="middle" className="pl-latin">Co</text>
      <Person x={480} y={240} h={92} />
    </g>
    <text x={140} y={200} textAnchor="middle" className="pl-tag">statute</text>
    <text x={670} y={200} textAnchor="middle" className="pl-tag">fraud</text>
    <Ground y={350} id={id} />
  </>
));

scene('minority', 'A member outvoted: whose right has been hurt decides which remedy fits.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    {[190, 280, 370, 460].map((x, i) => <Person key={x} x={x} y={280} h={96} />)}
    <Person x={620} y={280} h={96} tone="pl-muted-figure" />
    <g className="pl-ink">
      <path d="M 540 220 H 570" className="pl-stroke" strokeDasharray="5 4" />
      <circle cx="620" cy="150" r="30" className="pl-accent-stroke" fill="none" strokeDasharray="4 4" />
      <text x="620" y="158" textAnchor="middle" className="pl-tag">1</text>
      <text x="325" y="150" textAnchor="middle" className="pl-tag">the majority</text>
    </g>
    <g className="pl-ink">
      {[['company hurt', 's 347 leave', 200], ['member hurt', 's 346', 560]].map(([a, b, x]) => (
        <g key={a}>
          <rect x={x - 100} y="316" width="200" height="52" rx="3" className="pl-paper pl-stroke" />
          <text x={x} y="338" textAnchor="middle" className="pl-tag">{a}</text>
          <text x={x} y="358" textAnchor="middle" className="pl-latin">{b}</text>
        </g>
      ))}
    </g>
  </>
));

scene('review-bench', 'Review looks at how the decision was made, not at whether it was the better decision.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <rect x="90" y="120" width="250" height="180" className="pl-fill pl-stroke" />
      <text x="215" y="102" textAnchor="middle" className="pl-tag">the decision</text>
      {[0, 1, 2, 3].map(i => <line key={i} x1="116" y1={160 + i * 34} x2={314 - (i % 2) * 40} y2={160 + i * 34} className="pl-line" />)}
      <circle cx="470" cy="210" r="60" className="pl-glass" />
      <circle cx="470" cy="210" r="60" className="pl-stroke" fill="none" strokeWidth="5" />
      <line x1="514" y1="254" x2="576" y2="314" className="pl-stroke" strokeWidth="9" strokeLinecap="round" />
      <text x="470" y="204" textAnchor="middle" className="pl-tag">how,</text>
      <text x="470" y="226" textAnchor="middle" className="pl-tag">not what</text>
    </g>
    <g className="pl-ink">
      {['illegality', 'irrationality', 'procedure'].map((t, i) => (
        <g key={t}>
          <rect x="600" y={100 + i * 66} width="150" height="46" rx="3" className="pl-paper pl-stroke" />
          <text x="675" y={128 + i * 66} textAnchor="middle" className="pl-tag">{t}</text>
        </g>
      ))}
    </g>
    <Ground y={330} id={id} />
  </>
));

scene('open-texture', 'A word with a settled core and a doubtful edge — and the cases that reach a court come from the edge.', id => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={sky(id)} />
    <g className="pl-ink">
      <circle cx="400" cy="196" r="150" className="pl-stroke" fill="none" strokeDasharray="6 6" />
      <circle cx="400" cy="196" r="150" fill={hatch2(id)} opacity="0.28" />
      <circle cx="400" cy="196" r="76" className="pl-fill pl-stroke" />
      <text x="400" y="192" textAnchor="middle" className="pl-latin">core</text>
      <text x="400" y="216" textAnchor="middle" className="pl-tag">settled</text>
      <text x="400" y="76" textAnchor="middle" className="pl-tag">penumbra of doubt</text>
      {[[250, 110], [560, 130], [300, 300], [540, 290], [620, 210]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" className="pl-accent-fill" />
      ))}
    </g>
    <text x={400} y={370} textAnchor="middle" className="pl-tag">the litigated cases sit in the ring, not the middle</text>
  </>
));

export default S2;
