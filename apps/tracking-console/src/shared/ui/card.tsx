import type { ReactNode } from 'react';

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}
