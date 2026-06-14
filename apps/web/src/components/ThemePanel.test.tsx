// @vitest-environment jsdom
import {render, screen} from '@testing-library/react';
import {expect, it} from 'vitest';
import {ThemePanel} from './ThemePanel';

it('shows the single MVP theme as selected', () => {
  render(<ThemePanel />);
  expect(screen.getByText('Playlist V4')).toBeInTheDocument();
  expect(screen.getByText('Selected')).toBeInTheDocument();
});
