import { useEffect, useState, useSyncExternalStore } from 'react';
import { localeExternalStore, t } from '../../../lib/i18n/store';
import './MatrixDisplay.css';

type Feedback = 'correct' | 'wrong' | null;
type Props = {
  matrix: number[][];
  rowLabels?: string[];
  colLabels?: string[];
  highlightRows?: Set<number>;
  highlightCols?: Set<number>;
  precision?: number;
  compact?: boolean;
  title?: string;
  editable?: boolean;
};

export function MatrixDisplay({ matrix, rowLabels = [], colLabels = [], highlightRows = new Set(), highlightCols = new Set(), precision = 3, compact = false, title = '', editable = false }: Props) {
  useSyncExternalStore(localeExternalStore.subscribe, localeExternalStore.getSnapshot, localeExternalStore.getSnapshot);
  const [answers, setAnswers] = useState<(string | null)[][]>([]);
  const [feedback, setFeedback] = useState<Feedback[][]>([]);

  useEffect(() => {
    if (editable && matrix.length > 0) {
      setAnswers(matrix.map((row) => row.map(() => null)));
      setFeedback(matrix.map((row) => row.map(() => null)));
    }
  }, [editable, matrix]);

  const format = (value: number) => {
    if (compact && Math.abs(value) < 1e-10) return '·';
    if (Math.abs(value) < 1e-10) return '0';
    if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && Math.abs(value) > 0)) return value.toExponential(precision - 1);
    return value.toFixed(precision);
  };
  const cellClass = (value: number, row: number, col: number) => {
    const classes: string[] = [];
    if (highlightRows.has(row) || highlightCols.has(col)) classes.push('hl');
    if (highlightRows.has(row) && highlightCols.has(col)) classes.push('hl-both');
    classes.push(value > 1e-10 ? 'pos' : value < -1e-10 ? 'neg' : 'zero');
    return classes.join(' ');
  };
  const checkAnswer = (row: number, col: number, value: string) => {
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) {
      setFeedback((current) => current.map((items, rowIndex) => rowIndex === row ? items.map((item, colIndex) => colIndex === col ? null : item) : items));
      return;
    }
    const expected = matrix[row][col];
    const tolerance = Math.max(Math.abs(expected) * 0.01, 0.01);
    setAnswers((current) => current.map((items, rowIndex) => rowIndex === row ? items.map((item, colIndex) => colIndex === col ? value : item) : items));
    setFeedback((current) => current.map((items, rowIndex) => rowIndex === row ? items.map((item, colIndex) => colIndex === col ? (Math.abs(parsed - expected) <= tolerance ? 'correct' : 'wrong') : item) : items));
  };

  const stats = editable ? feedback.reduce((result, row) => {
    for (const value of row) {
      result.total += 1;
      if (value !== null) { result.answered += 1; if (value === 'correct') result.correct += 1; }
    }
    return result;
  }, { total: 0, answered: 0, correct: 0 }) : null;

  return <div className="react-matrix-display">
    {title && <div className="matrix-title">{title}{editable && stats && <span className="quiz-stats">{stats.correct}/{stats.answered} correctas {stats.answered > 0 && `(${Math.round(stats.correct / stats.answered * 100)}%)`}</span>}</div>}
    <div className="matrix-scroll"><table className="matrix-table">
      {colLabels.length > 0 && <thead><tr><th className="corner" />{colLabels.map((label, index) => <th className={highlightCols.has(index) ? 'hl' : undefined} key={`${label}-${index}`}>{label}</th>)}</tr></thead>}
      <tbody>{matrix.map((row, rowIndex) => <tr key={rowIndex}>
        {rowLabels.length > 0 && <th className={`row-label${highlightRows.has(rowIndex) ? ' hl' : ''}`}>{rowLabels[rowIndex] ?? ''}</th>}
        {row.map((cell, colIndex) => editable ? <td className={`quiz-cell${feedback[rowIndex]?.[colIndex] === 'correct' ? ' quiz-correct' : feedback[rowIndex]?.[colIndex] === 'wrong' ? ' quiz-wrong' : compact && Math.abs(cell) < 1e-10 ? ' quiz-zero' : ''}`} key={colIndex}>
          {compact && Math.abs(cell) < 1e-10 ? <span className="quiz-auto">·</span> : feedback[rowIndex]?.[colIndex] !== null && feedback[rowIndex]?.[colIndex] !== undefined ? <><span className="quiz-answer">{answers[rowIndex]?.[colIndex]}</span><span className="quiz-expected" title={`${t('dsm.expectedValue')}: ${format(cell)}`}>{feedback[rowIndex]?.[colIndex] === 'correct' ? '' : format(cell)}</span></> : <input type="text" className="quiz-input" placeholder="?" onBlur={(event) => checkAnswer(rowIndex, colIndex, event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />}
        </td> : <td className={cellClass(cell, rowIndex, colIndex)} key={colIndex}>{format(cell)}</td>)}
      </tr>)}</tbody>
    </table></div>
  </div>;
}
