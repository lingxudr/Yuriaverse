export function toSlug(input = ''): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/[^/]+\//, '')
    .replace(/^anime\//, '')
    .replace(/\?.*$/, '')
    .replace(/\/$/, '')
    .split('/')
    .pop()!
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function absoluteUrl(path: string, base: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
