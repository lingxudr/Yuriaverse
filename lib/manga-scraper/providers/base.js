const { parseDetail, collectImages } = require('../core/parser');

function createProvider(config) {
  return {
    id: config.id,
    name: config.name,
    hosts: config.hosts || [],
    selectors: config.selectors || {},
    match(url = '') {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return this.hosts.some((needle) => host.includes(needle));
      } catch {
        return false;
      }
    },
    parseDetail(html, url) {
      return parseDetail(html, url, this);
    },
    parseReaderImages($, url) {
      return collectImages($, url);
    },
    validateDetail(detail) {
      return Boolean(detail && (detail.title || detail.synopsis || detail.chapters?.length));
    },
    validateReader(images) {
      return Array.isArray(images) && images.length >= 3;
    },
    normalize(item) {
      return item;
    },
    ...config
  };
}

module.exports = { createProvider };
