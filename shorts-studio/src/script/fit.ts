/** Shrinks a font size when a text is longer than the layout was designed for. */
export const fit = (text: string, base: number, designedChars: number) => {
  const len = text.length;
  if (len <= designedChars) return base;
  return Math.max(base * 0.6, base * Math.sqrt(designedChars / len));
};

export const estimateSeconds = (voiceover: string) => {
  const words = voiceover.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round((words / 2.6 + 1.2) * 10) / 10);
};
