import { useEffect, useRef } from 'react';
import { POSTS, findPost, formatPostDate } from '../../lib/blog';
import { readingMinutes } from '../../lib/blog/types';
import { publicUrl } from '../../lib/i18n/public-routes';
import { applyPageMeta, restorePageMeta } from '../../lib/page-meta';
import { enterApp } from '../../components/landing/landing-utils';
import '../../components/landing/landing.css';
import '../../components/blog/blog.css';
import { usePublicI18n } from '../i18n/PublicI18n';
import { PublicLink } from '../landing/PublicLink';
import { LandingFooter } from '../landing/Sections';
import { usePublicFontPreloads } from '../public/usePublicFontPreloads';
import { BlogBlocks } from './BlogBlocks';
import { BlogNav } from './BlogNav';

export function BlogPage({ path }: { path: string }) {
  const { locale, t, tp } = usePublicI18n();
  const pageRef = useRef<HTMLDivElement>(null);
  const match = path.match(/^\/blog\/(.+?)\/?$/);
  const slug = match ? decodeURIComponent(match[1]) : null;
  const post = slug ? findPost(slug) : undefined;
  const body = post?.i18n[locale];
  usePublicFontPreloads();

  useEffect(() => {
    applyPageMeta({
      title: body ? `${body.title} — Stabileo` : t('blog.indexTitle'),
      description: body ? body.excerpt : t('blog.lead'),
      locale,
      path: post ? `/blog/${post.slug}` : '/blog',
      article: post && body ? {
        headline: body.title,
        description: body.excerpt,
        datePublished: post.date,
        authors: post.authors,
        url: publicUrl(`/blog/${post.slug}`, locale),
        locale,
      } : undefined,
    });
    return restorePageMeta;
  }, [body, locale, post, t]);

  useEffect(() => { pageRef.current?.scrollTo({ top: 0 }); }, [path]);

  return (
    <div className="landing blog" ref={pageRef}>
      <BlogNav inPost={!!slug} />
      {slug && !post ? (
        <section className="sec sec--ink blog-head"><div className="wrap">
          <h1 className="display">{t('blog.notFound')}</h1>
          <p className="lead">{t('blog.notFoundBody')}</p>
          <PublicLink to="/blog" className="link-arrow">{t('blog.allPosts')}</PublicLink>
        </div></section>
      ) : post && body ? (
        <article className="sec sec--ink post"><div className="wrap post-wrap">
          <PublicLink to="/blog" className="link-arrow post-back">{t('blog.allPosts')}</PublicLink>
          <h1 className="display post-title">{body.title}</h1>
          <div className="post-meta">
            <time dateTime={post.date}>{formatPostDate(post.date, locale)}</time><span aria-hidden="true">·</span>
            <span>{tp('blog.readingTime', { n: readingMinutes(body) })}</span><span aria-hidden="true">·</span>
            <span>{t('blog.by')} {post.authors.join(', ')}</span>
          </div>
          <ul className="post-tags">{post.tagKeys.map((key) => <li key={key}>{t(key)}</li>)}</ul>
          <p className="post-excerpt">{body.excerpt}</p>
          <div className="post-body"><BlogBlocks blocks={body.blocks} /></div>
          <div className="post-foot">
            <button className="btn btn-primary" onClick={enterApp}>{t('blog.openEditor')}</button>
            <PublicLink to="/blog" className="link-arrow">{t('blog.allPosts')}</PublicLink>
          </div>
        </div></article>
      ) : (
        <>
          <section className="sec sec--ink blog-head"><div className="wrap">
            <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" /><span className="eyebrow-label">{t('blog.eyebrow')}</span></p>
            <h1 className="display">{t('blog.title')}</h1><p className="lead">{t('blog.lead')}</p>
          </div></section>
          <section className="sec sec--paper blog-list"><div className="wrap">
            {POSTS.length === 0 ? <p className="lead">{t('blog.empty')}</p> : <ul className="post-cards">{POSTS.map((listedPost) => {
              const listedBody = listedPost.i18n[locale];
              return <li key={listedPost.slug}><article className="post-card" data-slug={listedPost.slug}>
                <div className="post-card-meta"><time dateTime={listedPost.date}>{formatPostDate(listedPost.date, locale)}</time><span aria-hidden="true">·</span><span>{tp('blog.readingTime', { n: readingMinutes(listedBody) })}</span></div>
                <h2><PublicLink to={`/blog/${listedPost.slug}`} className="post-card-title">{listedBody.title}</PublicLink></h2>
                <p>{listedBody.excerpt}</p>
                <PublicLink to={`/blog/${listedPost.slug}`} className="link-arrow">{t('blog.readMore')}</PublicLink>
              </article></li>;
            })}</ul>}
          </div></section>
        </>
      )}
      <LandingFooter />
    </div>
  );
}
