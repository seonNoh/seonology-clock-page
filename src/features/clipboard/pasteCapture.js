function isImageFile(value) {
  return Boolean(value) && typeof value.type === 'string' && value.type.startsWith('image/');
}

function fingerprint(file) {
  return `${file.name}::${file.type}::${file.size}::${file.lastModified ?? ''}`;
}

function collect(candidates) {
  const files = [];
  const seenFiles = new Set();
  const seenKeys = new Set();

  for (const candidate of candidates) {
    if (!isImageFile(candidate)) continue;
    if (seenFiles.has(candidate)) continue;
    const key = fingerprint(candidate);
    if (seenKeys.has(key)) continue;
    seenFiles.add(candidate);
    seenKeys.add(key);
    files.push(candidate);
  }

  return files;
}

export function extractImageFiles(dataTransfer) {
  if (!dataTransfer) return [];

  const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
  if (items.length > 0) {
    const fromItems = collect(items
      .filter((item) => item?.kind === 'file' && typeof item.type === 'string' && item.type.startsWith('image/'))
      .map((item) => (typeof item.getAsFile === 'function' ? item.getAsFile() : null)));
    if (fromItems.length > 0) return fromItems;
  }

  return collect(dataTransfer.files ? Array.from(dataTransfer.files) : []);
}
