import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { publicHref } from '../../lib/i18n/public-routes';
import { goPublic } from '../../components/landing/landing-utils';
import { usePublicI18n } from '../i18n/PublicI18n';

type PublicLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
  children: ReactNode;
};

export function PublicLink({ to, children, onClick, ...rest }: PublicLinkProps) {
  const { locale } = usePublicI18n();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.shiftKey || event.altKey
    ) return;
    event.preventDefault();
    goPublic(to);
  }

  return (
    <a href={publicHref(to, locale)} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
