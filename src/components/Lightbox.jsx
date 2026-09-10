import { useEffect, useState } from 'react';
import { useDialog } from './Overlays.jsx';

/**
 * Enlarge a figure to the whole screen, on request.
 *
 * Figures now fit the width they are given rather than scrolling sideways, and
 * for a diagram that is the whole answer: it reflows, and every label stays
 * above the type floor. An illustration cannot reflow. It is one drawing, and
 * on a 326px screen it is legible AS A WHOLE and not in its detail — the labels
 * inside a scene are part of the picture, not text that can be re-laid out.
 *
 * So the detail is available on request instead of being either forced on the
 * page or lost. That distinction is the whole design here: a page that scrolls
 * sideways without being asked is a defect; a surface that does it because the
 * reader tapped "Enlarge" is a reader who has asked for detail and been given
 * it. The same argument makes the nav drawer acceptable.
 *
 * Offered only on small screens. Above that the figure is already at a size
 * where the detail is there, and an enlarge control that adds nothing is a
 * control that teaches readers their taps do nothing.
 */
export function useNarrow(query = '(max-width: 780px)') {
  const [narrow, setNarrow] = useState(
    () => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return narrow;
}

export default function Lightbox({ open, onClose, label, children }) {
  // `useDialog` is a hook, so it is called whether or not this is open — it
  // does nothing until `open` is true, and returns focus on close.
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="lightbox" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}>
      <div className="lightbox-bar">
        <button type="button" className="lightbox-close" onClick={onClose}>Close ✕</button>
      </div>
      {/* Panning inside here is expected rather than a failure: the reader
          asked for detail, and detail on a small screen means a drawing larger
          than the screen. */}
      <div className="lightbox-fig">{children}</div>
    </div>
  );
}
