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

  callback = callback || function() {};

  if(!patternURL) {
    callback('error', 'no pattern file');
    return;
  }

  var loading = {};

  loading.status = 1;
  loading.callback = callback;

  loading.pattern = {};
  loading.attribute = {};
  loading.patternPatch = {};
  loading.attributePatch= {};

  if(patternURL) {
    textglass.getURL(loading.pattern, loading, patternURL);
  }

  if(attributeURL) {
    textglass.getURL(loading.attribute, loading, attributeURL);
  }

  if(patternPatchURL) {
    textglass.getURL(loading.patternPatch, loading, patternPatchURL);
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

      if(loadobj.json.TextGlassSpecVersion !== 1.0) {
        textglass.loadError(loadobj, 'Invalid TextGlassSpecVersion found');
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
  textglass.debug(0, 'loadError()', msg);

  if(loadobj.parent.status > 0) {
    loadobj.parent.callback('error', msg);
  }

  loadobj.status = -1;
  loadobj.parent.status = -1;
};

textglass.readyToLoad = function(loading) {
  textglass.debug(2, 'readyToLoad()');
  
  if(loading.status < 0) {
    return;
  }

  if(loading.pattern.url && loading.pattern.status !== 2) {
    return;
  }

  if(loading.attribute.url && loading.attribute.status !== 2) {
    return;
  }

  if(loading.patternPatch.url && loading.patternPatch.status !== 2) {
    return;
  }

  if(loading.attributePatch.url && loading.attributePatch.status !== 2) {
    return;
  }

  var error = textglass.loadObjects(loading.pattern.json, loading.attribute.json,
      loading.patternPatch.json, loading.attributePatch.json);

  if(error) {
    loading.callback('error', 'Error loading domain: ' + error);
    return;
  }

  if(loading.callback) {
    loading.callback('ready', loading.pattern.json.domain);
  }
};

textglass.loadObjects = function(pattern, attribute, patternPatch, attributePatch) {
  var domainName = pattern.domain;
  var domainVersion = pattern.domainVersion;

  if(pattern.type !== 'pattern') {
    return 'Invalid pattern file';
  }
  
  if(attribute) {
    if(attribute.type !== 'attribute' || attribute.domain !== domainName || attribute.domainVersion !== domainVersion) {
      return 'Invalid attribute file';
    }
  }

  textglass.debug(2, 'Loading:', domainName, 'Version:', domainVersion);

  if(textglass.domains[domainName]) {
    return "Domain already loaded";
  }

  var domain = {};
  textglass.domains[domainName] = domain;

  if(!pattern.inputParser) {
    pattern.inputParser = {};
  }

  if(pattern.inputParser.transformers && pattern.inputParser.transformers.length > 0) {
    pattern.inputParser.compiledTransformers = [];
    var transformers = pattern.inputParser.transformers;
    for(var i = 0; i < transformers.length; i++) {
      var transformer = transformers[i];
      
      textglass.debug(2, 'Found transformer:', transformer.type);

      var compiled = textglass.compileTransformer(transformer);

      if(!compiled) {
        return 'Transformer not found: ' + transformer.type;
      }

      pattern.inputParser.compiledTransformers.push(compiled);
    }
  }

  domain.name = domainName;
  domain.version = domainVersion;
  domain.pattern = pattern;
  domain.attribute = attribute;
  domain.classify = function(input) {
    return textglass.classify(domain, input);
  };
};

textglass.classify = function(domain, input) {
  textglass.debug(1, 'classify() domain', domain.name);
  textglass.debug(1, 'classify() input', input);

  if(domain.pattern.inputParser.compiledTransformers) {
    for(var i = 0; i < domain.pattern.inputParser.compiledTransformers.length; i++) {
      var compiledTransformer = domain.pattern.inputParser.compiledTransformers[i];
      input = compiledTransformer(input);
    }
  }

  textglass.debug(1, 'classify() transformed', input);
}

textglass.compileTransformer = function(transformer) {
  if(transformer.type === 'LowerCase') {
    return textglass.transformers.LowerCase;
  } else if(transformer.type === 'ReplaceAll') {
    return function(input) {
      return textglass.transformers.ReplaceAll(input, transformer.parameters.find, transformer.parameters.replaceWith);
    };
  }
};

textglass.transformers = {};

textglass.transformers.LowerCase = function(input) {
  return input.toLowerCase();
}

textglass.transformers.ReplaceAll = function(input, find, replaceWith) {
  return input.split(find).join(replaceWith);
}

textglass.debug(1, 'TextGlass Javascript Client', textglass.version);
