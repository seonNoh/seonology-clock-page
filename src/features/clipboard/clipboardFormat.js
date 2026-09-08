const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' });

export function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatType(value) {
  return typeof value === 'string' && value.startsWith('image/')
    ? value.slice('image/'.length).toUpperCase()
    : 'IMAGE';
}

export function formatTime(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? '시각 미상' : TIME_FORMAT.format(new Date(time));
}

// 갤러리 상단 한 줄. limits 를 받기 전에는 총량만 보여 준다.
export function formatUsage({ totalBytes, count, limits }) {
  return limits
    ? `사용량 ${formatBytes(totalBytes)} / ${formatBytes(limits.maxTotalBytes)} · ${count} / ${limits.maxItems}`
    : `사용량 ${formatBytes(totalBytes)} · ${count}장`;
}
