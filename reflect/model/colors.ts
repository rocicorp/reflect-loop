// start color, end color
type Color = [number, number, number];
const COLOR_PALATE: Color[] = [
  // Pink
  [252, 73, 171],
  // Light Blue
  [95, 232, 255],
  // Orange
  [255, 153, 0],
  // Green
  [100, 255, 0],
  // Blue
  [57, 184, 255],
  // Red
  [255, 156, 156],
  // Turquoise
  [46, 214, 214],
  // Magenta
  [235, 10, 255],
  // Citrine
  [237, 200, 4],
];

export const simpleHash = (s: string) => {
  let hash = 0,
    i,
    chr;
  if (s.length === 0) return hash;
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export function colorIDFromID(id: string): string {
  return Math.floor(simpleHash(id) * COLOR_PALATE.length).toString();
}

export function colorStringForColorID(id: string) {
  const index = Number.parseInt(id);
  const c = COLOR_PALATE[index];
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
