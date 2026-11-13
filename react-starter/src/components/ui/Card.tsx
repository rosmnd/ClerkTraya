import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div';
}

export function Card({ as: Element = 'article', className = '', ...props }: CardProps) {
  return <Element className={`card ${className}`} {...props} />;
}
