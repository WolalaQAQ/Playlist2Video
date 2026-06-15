const MAX_TITLE_FONT_SIZE = 92;
const MIN_TITLE_FONT_SIZE = 30;
const SHRINK_START_UNITS = 22;
const SHRINK_END_UNITS = 96;

function estimateTitleUnits(title: string): number {
  return Array.from(title.trim()).reduce((total, char) => {
    if (/\s/.test(char)) return total + 0.35;
    if (/[\u3000-\u9fff\uff00-\uffef]/u.test(char)) return total + 1;
    if (/[A-Z0-9]/.test(char)) return total + 0.72;
    if (/[a-z]/.test(char)) return total + 0.58;
    return total + 0.5;
  }, 0);
}

export function getTrackTitleFontSize(title: string): number {
  const titleUnits = estimateTitleUnits(title);
  if (titleUnits <= SHRINK_START_UNITS) return MAX_TITLE_FONT_SIZE;
  if (titleUnits >= SHRINK_END_UNITS) return MIN_TITLE_FONT_SIZE;

  const shrinkProgress = (titleUnits - SHRINK_START_UNITS) / (SHRINK_END_UNITS - SHRINK_START_UNITS);
  return Math.round(MAX_TITLE_FONT_SIZE - shrinkProgress * (MAX_TITLE_FONT_SIZE - MIN_TITLE_FONT_SIZE));
}
