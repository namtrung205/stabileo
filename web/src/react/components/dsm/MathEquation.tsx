import katex from 'katex';
import './MathEquation.css';

type Props = { equation: string; displayMode?: boolean };

export function MathEquation({ equation, displayMode = false }: Props) {
  const html = katex.renderToString(equation, {
    displayMode,
    throwOnError: false,
    output: 'html',
  });
  return <span className={`math-eq${displayMode ? ' display' : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
