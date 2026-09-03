type EyebrowProps = { n: string; label: string };

export function Eyebrow({ n, label }: EyebrowProps) {
  return (
    <p className="eyebrow">
      <span className="eyebrow-rule" aria-hidden="true" />
      <span className="eyebrow-n">{n}</span>
      <span className="eyebrow-label">{label}</span>
    </p>
  );
}
