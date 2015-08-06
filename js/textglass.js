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

textglass.loadURLs = function(patternURL, attributeURL, patternPatchURL, attributePatchURL, callback) {
  textglass.debug(2, 'patternURL:', patternURL);
  textglass.debug(2, 'attributeURL:', attributeURL);
  textglass.debug(2, 'patternPatchURL:', patternPatchURL);
  textglass.debug(2, 'attributePatchURL:', attributePatchURL);

  if(!patternURL) {
    if(callback) {
      callback('error', 'no pattern file');
    }
    return;
  }

  var loading = {};

  loading.status = 1;
  loading.callback = callback;

  loading.pattern = {};
  loading.patternPatch = {};
  loading.attribute = {};
  loading.attributePatch= {};

  if(patternURL) {
    textglass.getURL(loading.pattern, loading, patternURL);
  }

  if(patternPatchURL) {
    textglass.getURL(loading.patternPatch, loading, patternPatchURL);
  }

  if(attributeURL) {
    textglass.getURL(loading.attribute, loading, attributeURL);
  }

  if(attributePatchURL) {
    textglass.getURL(loading.attributePatch, loading, attributePatchURL);
  }
};

textglass.getURL = function(loadobj, parent, url) {
  loadobj.url = url;
  loadobj.status = 1;
  loadobj.parent = parent;
  loadobj.request = new XMLHttpRequest();
  loadobj.request.open('GET', loadobj.url, true);

  loadobj.request.onload = function() {
    if (loadobj.request.status >= 200 && loadobj.request.status < 300){
      try {
        loadobj.json = JSON.parse(loadobj.request.responseText);
      } catch(e) {
        textglass.loadError(loadobj, 'JSON parse error: ' + e);
        return;
      }

      loadobj.status = 2;

      textglass.readyToLoad(loadobj.parent);
    } else {
      var msg = 'Bad response code ' + loadobj.request.status + 'for ' + loadobj.url;
      textglass.loadError(loadobj, msg);
    }
  };

  loadobj.request.onerror = function() {
    var msg = 'Error for ' + loadobj.url;
    textglass.loadError(loadobj, msg);
  };

  loadobj.request.send();
};

textglass.loadError = function(loadobj, msg) {
  textglass.debug(0, msg);

  loadobj.status = -1;
  loadobj.parent.status = -1;

  if(loadobj.parent.callback) {
    loadobj.parent.callback('error', msg);
  }
};

textglass.readyToLoad = function(loading) {
  textglass.debug(2, 'readyToLoad()');
  
  if(loading.status < 0) {
    return;
  }

  if(loading.pattern.url && loading.pattern.status !== 2) {
    return;
  }

  if(loading.patternPatch.url && loading.patternPatch.status !== 2) {
    return;
  }

  if(loading.attribute.url && loading.attribute.status !== 2) {
    return;
  }

  if(loading.attributePatch.url && loading.attributePatch.status !== 2) {
    return;
  }

  textglass.loadObjects(loading.pattern.json);

  if(loading.callback) {
    loading.callback('ready');
  }
};

textglass.loadObjects = function(patternFile) {
  textglass.debug(2, 'loadPattern:', patternFile.domain);
};

textglass.debug(1, 'TextGlass Javascript Client', textglass.version);
