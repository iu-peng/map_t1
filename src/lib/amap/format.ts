/** 米 → 可读距离（m / km）。 */
export function formatDistance(meters?: number): string {
  if (!meters && meters !== 0) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** 秒 → 可读时长（分钟 / 小时 分钟）。 */
export function formatDuration(seconds?: number): string {
  if (!seconds && seconds !== 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes} 分钟`;
  return `${hours} 小时 ${minutes} 分钟`;
}
