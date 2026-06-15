// @vitest-environment jsdom
import {render, screen} from '@testing-library/react';
import {expect, it} from 'vitest';
import {translations} from '../i18n';
import {ThemePanel} from './ThemePanel';

it('shows the single MVP theme as selected', () => {
  render(<ThemePanel copy={translations.en.theme} />);
  expect(screen.getByText('Playlist V4')).toBeInTheDocument();
  expect(screen.getByText('Selected')).toBeInTheDocument();
});
