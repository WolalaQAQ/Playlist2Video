import React from 'react';
import type {Translation} from '../i18n';

export const ThemePanel: React.FC<{copy: Translation['theme']}> = ({copy}) => (
  <section className="card">
    <h2>{copy.title}</h2>
    <div className="theme-option selected">
      <strong>{copy.name}</strong>
      <p>{copy.description}</p>
      <span>{copy.selected}</span>
    </div>
  </section>
);
