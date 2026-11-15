export function makeProductImage(
  label: string,
  emoji: string,
  bgFrom: string,
  bgTo: string,
  accent: string
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgFrom}" />
          <stop offset="100%" stop-color="${bgTo}" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#g)" />
      <circle cx="320" cy="80" r="90" fill="${accent}" opacity="0.14" />
      <circle cx="70" cy="330" r="110" fill="${accent}" opacity="0.10" />
      <rect x="90" y="78" width="220" height="200" rx="28" fill="#ffffff" opacity="0.88" />
      <text x="200" y="192" text-anchor="middle" font-size="88" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
      <text x="200" y="330" text-anchor="middle" font-size="20" font-weight="600" fill="#1c1e21" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif">${label}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
