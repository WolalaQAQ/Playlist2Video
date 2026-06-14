import React from 'react';
import {themeOptions} from '@playlist2video/shared';

export const ThemePanel: React.FC = () => (
  <section className="card">
    <h2>Theme</h2>
    <div className="theme-option selected">
      <strong>{themeOptions[0].name}</strong>
      <p>{themeOptions[0].description}</p>
      <span>Selected</span>
    </div>
  </section>
);
