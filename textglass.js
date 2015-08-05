var textglass = textglass || {};

if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = textglass;
}

textglass.version = '1.0.0';
textglass.debugLevel = textglass.debugLevel || 2;

textglass.domains = {};

textglass.debug = textglass.debug || function(level, s) {
  if(level <= textglass.debugLevel) {
    var params = Array.prototype.slice.call(arguments, 1);
    console.log.apply(console, params);
  }
};

textglass.loadURLs = function(patternURL) {
  textglass.debug(2, 'patternURL:', patternURL);
};

textglass.loadObjects = function(patternFile) {
  textglass.debug(2, 'loadPattern:', patternFile.domain);
};

textglass.debug(1, 'TextGlass Javascript Client', textglass.version);
