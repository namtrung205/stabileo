import { useRef, useState } from 'react';
import { usePublicI18n } from '../i18n/PublicI18n';

type PostEmbedProps = {
  query: string;
  mode?: 'basic' | 'pro';
  label: string;
};

const FULL_UI_WIDTH = 900;

export function PostEmbed({ query, mode = 'basic', label }: PostEmbedProps) {
  const { t } = usePublicI18n();
  const [src, setSrc] = useState('');
  const frameRef = useRef<HTMLDivElement>(null);
  const fullHref = `/app/${mode}?${query}`;

  function open() {
    const frame = frameRef.current;
    const wide = (frame?.clientWidth ?? 0) >= FULL_UI_WIDTH;
    setSrc(wide ? fullHref : `/app/${mode}?embed&${query}`);

    let tries = 0;
    const settle = () => {
      const current = frameRef.current;
      if (!current || tries++ > 12) return;
      const top = current.getBoundingClientRect().top;
      if (Math.abs(top - 76) > 12) current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(settle, 300);
    };
    requestAnimationFrame(settle);
  }

  return (
    <figure className="post-embed">
      <div className={`post-embed-frame${src ? ' live' : ''}`} ref={frameRef}>
        {src ? (
          <iframe src={src} title={label} loading="lazy" />
        ) : (
          <button className="post-embed-start" onClick={open}>
            <span className="post-embed-play" aria-hidden="true">▶</span>
            <span className="post-embed-start-label">{t('blog.embedStart')}</span>
            <span className="post-embed-start-note">{t('blog.embedNote')}</span>
          </button>
        )}
      </div>
      <figcaption>
        {label}
        <a href={fullHref} target="_blank" rel="noreferrer">{t('blog.embedOpenFull')}</a>
      </figcaption>
    </figure>
  );
}
