/* HireWin brand loader.
 *
 * A sweeping gradient ring around a glowing card whose three bars "climb"
 * like a resume score rising — the product's core promise, as motion.
 *
 * Usage:
 *   <BrandLoader />                       full-screen centered
 *   <BrandLoader label="Optimizing" />    custom caption
 *   <BrandLoader inline />                just the mark, no full-screen wrap
 */

type Props = {
  /** Caption under the mark. Pass an empty string to hide it. */
  label?: string;
  /** Render just the animated mark, without the full-screen centering wrapper. */
  inline?: boolean;
  /** Background for the full-screen wrapper. Ignored when `inline`. */
  background?: string;
};

function Mark() {
  return (
    <div className="hw-loader-wrap" role="status" aria-label="Loading">
      <div className="hw-loader-halo" />
      <div className="hw-loader-ring hw-loader-ring--outer" />
      <div className="hw-loader-ring hw-loader-ring--inner" />
      <div className="hw-loader-orbit">
        <span className="hw-loader-comet" />
      </div>
      <div className="hw-loader-core">
        <span className="hw-loader-bar" />
        <span className="hw-loader-bar" />
        <span className="hw-loader-bar" />
        <div className="hw-loader-shine" />
      </div>
    </div>
  );
}

export default function BrandLoader({ label = 'Loading', inline = false, background = '#080d1a' }: Props) {
  const body = (
    <div className="flex flex-col items-center gap-4">
      <Mark />
      {label && <p className="hw-loader-label">{label}</p>}
    </div>
  );

  if (inline) return body;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background }}>
      {body}
    </div>
  );
}

/** Just the animated mark — handy for inline spots (buttons, small cards). */
export function BrandLoaderMark() {
  return <Mark />;
}
