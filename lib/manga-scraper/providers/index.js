const { createProvider } = require('./base');
const komiku = require('./komiku');
const komikcast = require('./komikcast');
const manhwaindo = require('./manhwaindo');
const natsu = require('./natsu');
const wurmz = require('./wurmz');
const generic = require('./generic');

const simpleProviders = [
  { id:'ainzscans', name:'AinzScans', hosts:['ainzscans'] },
  { id:'kiryuu', name:'Kiryuu', hosts:['kiryuu'] },
  { id:'shinigami', name:'Shinigami', hosts:['shinigami'] },
  { id:'mangaku', name:'Mangaku', hosts:['mangaku'] },
  { id:'westmanga', name:'WestManga', hosts:['westmanga'] },
  { id:'mangadex', name:'MangaDex', hosts:['mangadex'] },
  { id:'comick', name:'Comick', hosts:['comick'] },
  { id:'bato', name:'Bato', hosts:['bato.to', 'batoto'] },
  { id:'mangafire', name:'MangaFire', hosts:['mangafire'] }
].map(createProvider);

const providers = [komiku, wurmz, natsu, manhwaindo, komikcast, ...simpleProviders, generic];

function providerForUrl(url='') {
  try {
    return providers.find((provider) => provider.match(url)) || generic;
  } catch {
    return generic;
  }
}

module.exports = { providers, providerForUrl };
