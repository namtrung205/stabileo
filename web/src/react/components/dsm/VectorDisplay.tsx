import './VectorDisplay.css';

type Props = {
  vector: number[];
  labels?: string[];
  precision?: number;
  title?: string;
  highlightIndices?: Set<number>;
  horizontal?: boolean;
};

const formatValue = (value: number, precision: number) => {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && Math.abs(value) > 0)) return value.toExponential(precision - 1);
  return value.toFixed(precision);
};

const valueClass = (value: number, highlighted: boolean) => `${highlighted ? ' hl' : ''}${value > 1e-10 ? ' pos' : value < -1e-10 ? ' neg' : ' zero'}`;

export function VectorDisplay({ vector, labels = [], precision = 4, title = '', highlightIndices = new Set(), horizontal = false }: Props) {
  return <div className="react-vector-display">
    {title && <div className="vec-title">{title}</div>}
    <div className={`vec-scroll${horizontal ? ' horizontal' : ''}`}>
      <table className={`vec-table${horizontal ? ' horizontal' : ''}`}>
        <tbody>
          {horizontal ? <>
            {labels.length > 0 && <tr>{labels.map((label, index) => <th className={highlightIndices.has(index) ? 'hl' : undefined} key={`${label}-${index}`}>{label}</th>)}</tr>}
            <tr>{vector.map((value, index) => <td className={valueClass(value, highlightIndices.has(index)).trim()} key={index}>{formatValue(value, precision)}</td>)}</tr>
          </> : vector.map((value, index) => <tr key={index}>
            {labels.length > 0 && <th className={highlightIndices.has(index) ? 'hl' : undefined}>{labels[index] ?? ''}</th>}
            <td className={valueClass(value, highlightIndices.has(index)).trim()}>{formatValue(value, precision)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}
