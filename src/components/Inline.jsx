import { Fragment } from 'react';

/**
 * The smallest possible inline markup for lesson prose: `**strong**` and
 * `*emphasis*`. Nothing else.
 *
 * It is parsed into React elements rather than injected as HTML. The content is
 * in the repository and therefore trusted, but `dangerouslySetInnerHTML` on
 * every paragraph of every lesson makes a future contributor's pasted-in text a
 * script injection, and there is no reason to keep that door open for two tags.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export default function Inline({ text }) {
  const s = String(text ?? '');
  if (!s.includes('*')) return s;
  return (
    <>
      {s.split(TOKEN).filter(Boolean).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
