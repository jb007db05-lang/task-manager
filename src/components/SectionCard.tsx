import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface SectionCardProps extends ComponentPropsWithoutRef<'section'> {
  children: ReactNode;
  className?: string;
}

function SectionCard({ children, className, ...props }: SectionCardProps): JSX.Element {
  return (
    <section
      {...props}
      className={['card p-6 relative', className ?? ''].join(' ')}
    >
      {children}
    </section>
  );
}

export default SectionCard;
