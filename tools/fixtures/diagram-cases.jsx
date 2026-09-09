import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import '../../src/styles/tokens.css'; import '../../src/styles/base.css'; import '../../src/styles/game.css';
import '../../src/styles/liquid.css'; import '../../src/styles/rail.css'; import '../../src/styles/learn.css';
import '../../src/styles/plates.css'; import '../../src/styles/interactive.css';
import Diagram from '../../src/components/Diagram.jsx';

const LONG = 'Pengangkutan Jalan Raya (Peruntukan Pindaan) 1987';
const HUGE = 'Supermassivelyunbreakablecompoundword';
const NOTE = 'a note long enough to wrap onto three separate lines when the box is narrow, which is the case that matters';

// Every case is named by what it is meant to break.
const CASES = [
  ['hierarchy', 'H1 single node', { rows: [{ label: 'Federal Court' }] }],
  ['hierarchy', 'H2 four across, notes', { rows: [[
    { label: 'High Court Malaya', note: NOTE }, { label: 'High Court Sabah', note: NOTE },
    { label: 'Sessions Court', note: NOTE }, { label: 'Magistrates', note: NOTE }]] }],
  ['hierarchy', 'H3 unbreakable word', { rows: [{ label: HUGE, note: HUGE }] }],
  ['hierarchy', 'H4 five deep + tone', { rows: [
    { label: 'Federal Court', tone: 'correct' }, { label: 'Court of Appeal' }, { label: 'High Court' },
    { label: 'Sessions', tone: 'wrong' }, { label: 'Magistrates' }] }],

  ['flow', 'F1 twelve steps, two-digit badge', { steps: Array.from({ length: 12 }, (_, i) => ({
    label: `Step number ${i + 1} of the whole thing`, note: 'a note that wraps' })) }],
  ['flow', 'F2 single step', { steps: [{ label: 'Only step' }] }],
  ['flow', 'F3 long label + long note', { steps: [
    { label: LONG, note: NOTE }, { label: LONG, note: NOTE }, { label: LONG, note: NOTE }] }],

  ['branch', 'B1 five branches', { question: 'Which limb applies here?', branches: Array.from({ length: 5 }, (_, i) => ({
    cond: `if the ${i + 1}th condition holds`, label: `Outcome ${i + 1}`, note: 'and the consequence of it' })) }],
  ['branch', 'B2 long question + long cond', { question: LONG + ' — ' + LONG,
    branches: [{ cond: NOTE, label: LONG, note: NOTE }, { cond: NOTE, label: 'Short', tone: 'wrong' }] }],

  ['timeline', 'T1 ten events', { events: Array.from({ length: 10 }, (_, i) => ({
    year: `19${50 + i}`, label: `Event ${i + 1}`, note: 'what changed' })) }],
  ['timeline', 'T2 very long label and note', { events: [
    { year: '1957', label: LONG + ' ' + LONG, note: NOTE }, { year: '2010', label: HUGE, note: HUGE, tone: 'wrong' }] }],

  ['matrix', 'M1 four columns', { cols: ['Seizable', 'Non-seizable', 'Either', 'Unclear'],
    rows: ['Bailable', 'Non-bailable', 'Discretionary'],
    cells: Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => ({ label: 'Arrest without a warrant', note: NOTE }))) }],
  ['matrix', 'M2 missing cells', { cols: ['A', 'B'], rows: ['One', 'Two'], cells: [[{ label: 'only this' }]] }],

  ['stack', 'S1 six layers, long labels', { layers: Array.from({ length: 6 }, (_, i) => ({
    label: LONG, note: i % 2 ? NOTE : undefined })) }],
  ['stack', 'S2 unbreakable', { layers: [{ label: HUGE, note: HUGE }, { label: 'Short' }] }],

  ['spectrum', 'P1 marks at both extremes', { from: 'no confidence', to: 'certainty',
    marks: [{ at: 0, label: 'the very lowest end of the scale' }, { at: 1, label: 'the very highest end of the scale' }] }],
  ['spectrum', 'P2 five adjacent marks', { from: 'low', to: 'high',
    marks: [0.1, 0.28, 0.46, 0.64, 0.82].map((at, i) => ({ at, label: `mark number ${i + 1} with a longer label` })) }],
];

// StrictMode, deliberately, because the app ships with it.
//
// It double-invokes renders in development and discards the first result, which
// is how an impure render shows up — and one did: the glossary linker mutated a
// shared Set during render, so in `npm run dev` every term vanished on the
// second pass while the built output was perfect. A renderer fixture that does
// not double-render cannot see that class of defect in the components it exists
// to test.
createRoot(document.getElementById('root')).render(
  <StrictMode>
  <MotionConfig reducedMotion="always">
    <div className="lesson-layout" data-module="m05-criminal-procedure">
      <div className="lesson-main sheet">
        <section className="lsec">
          <Diagram kind="hierarchy" title="CALIBRATION" alt="calib" rows={[{ label: 'Federal Court' }]} />
          {CASES.map(([kind, name, props]) => (
            <Diagram key={name} kind={kind} title={name} alt={name} {...props} />
          ))}
        </section>
      </div>
    </div>
  </MotionConfig>
  </StrictMode>
);