import type { Block } from '../../lib/blog';
import { PostEmbed } from './PostEmbed';

export function BlogBlocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((block, blockIndex) => {
    const key = `${block.k}-${blockIndex}`;
    if (block.k === 'h') return <h2 className="post-h" key={key}>{block.t}</h2>;
    if (block.k === 'p') return <p className="post-p" key={key}>{block.t}</p>;
    if (block.k === 'ul') return <ul className="post-list" key={key}>{block.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
    if (block.k === 'ol') return <ol className="post-list post-list--num" key={key}>{block.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>;
    if (block.k === 'quote') return <blockquote className="post-quote" key={key}>{block.t}</blockquote>;
    if (block.k === 'note') return <aside className="post-note" key={key}>{block.t}</aside>;
    if (block.k === 'embed') return <PostEmbed query={block.query} mode={block.mode} label={block.label} key={key} />;
    return (
      <figure className="post-figure" key={key}>
        <div className="post-table-scroll">
          <table className="post-table">
            <thead><tr>{block.head.map((heading, index) => <th scope="col" key={`${index}-${heading}`}>{heading}</th>)}</tr></thead>
            <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => cellIndex === 0
              ? <th scope="row" key={cellIndex}>{cell}</th>
              : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <figcaption>{block.caption}</figcaption>
      </figure>
    );
  })}</>;
}
