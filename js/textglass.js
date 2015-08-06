var textglass = textglass || {};

if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = textglass;
}

textglass.version = '1.0.0';
textglass.debugLevel = textglass.debugLevel || 2;

textglass.domains = {};

textglass.debug = textglass.debug || function(level, s) {
  if(level <= textglass.debugLevel) {
    var params = Array.prototype.slice.call(arguments, 0);
    params[0] = 'textglass';
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

  pattern.patternIndex = {};

  for(var i = 0; i < pattern.patternSet.patterns.length; i++) {
    var patternObj = pattern.patternSet.patterns[i];

    patternObj.rank = textglass.getPatternRank(patternObj);

    textglass.debug(2, 'Found pattern:', patternObj.patternId,
        'tokens:', patternObj.patternTokens, 'rank:', patternObj.rank );

    for(var j = 0; j < patternObj.patternTokens.length; j++) {
      var token = patternObj.patternTokens[j];

      var patternList = pattern.patternIndex[token];

      if(!patternList) {
        patternList = [];
        pattern.patternIndex[token] = patternList;
      }

      patternList.push(patternObj);
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

  var tokens = textglass.split(input, domain.pattern.inputParser.tokenSeperators);

  textglass.debug(1, 'classify() tokens', tokens);

  var tokenStream = [];
  var ngramConcatSize = domain.pattern.inputParser.ngramConcatSize || 1;

  for(var i = 0; i < tokens.length; i++) {
    var ngram = '';
    var ngramParts = [];

    for(var size = ngramConcatSize; size > 0 && i + ngramConcatSize - size < tokens.length; size--) {
      ngram += tokens[i + ngramConcatSize - size];

      ngramParts.unshift(ngram);
    }

    tokenStream.push.apply(tokenStream, ngramParts);

    ngramParts = [];
  }

  textglass.debug(1, 'classify() ngrams', tokenStream);

  var matchedTokens = [];
  var candidates = [];
  var winner = undefined;

  for(var i = 0; i < tokenStream.length; i++) {
    var token = tokenStream[i];
    var matched = domain.pattern.patternIndex[token];

    if(matched) {
      matchedTokens.push(token);

      for(var j = 0; j < matched.length; j++) {
        var match = matched[j];

        if(candidates.indexOf(match) === -1) {
          candidates.push(match);
        }
      }

      textglass.debug(2, 'Hit:', token, 'candidates:', matched);
    }
  }

  if(!winner) {
    for(var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];

      if(textglass.isPatternValid(candidate, matchedTokens)) {
        if(winner == null) {
          winner = candidate;
        } else if(candidate.rank > winner.rank) {
          winner = candidate;
        } else if(candidate.rank === winner.rank &&
            textglass.getMatchedLength(candidate, matchedTokens) > textglass.getMatchedLength(winner, matchedTokens)) {
          winner = candidate;
        }
      }
    }
  }

  textglass.debug(1, 'Winner:', (winner ? winner.patternId : 'null'));
};

textglass.isPatternValid = function(pattern, matchedTokens) {
  var lastFound = -1;

  for(var i = 0; i < pattern.patternTokens.length; i++) {
    var patternToken = pattern.patternTokens[i];

    var found = matchedTokens.indexOf(patternToken);

    if(found == -1 && (pattern.patternType === 'SimpleAnd' || pattern.patternType === 'SimpleOrderedAnd')) {
      return false;
    }

    if(found >= 0 && pattern.patternType === 'Simple') {
      return true;
    }

    if(pattern.patternType === 'SimpleOrderedAnd') {
      if(found <= lastFound) {
        return false;
      } else {
        lastFound = found;
      }
    }
  }

  return pattern.patternType !== 'Simple';
};

textglass.getPatternRank = function(pattern) {
  var rank = pattern.rankValue;

  if(pattern.rankType === 'Weak') {
    rank += 100000;
  } else if(pattern.rankType === 'Strong') {
    return 10000000;
  }

  return rank;
};

textglass.getMatchedLength = function(pattern, matchedToken) {
  return 0;
};

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
};

textglass.transformers.ReplaceAll = function(input, find, replaceWith) {
  return input.split(find).join(replaceWith);
};

textglass.split = function(source, tokenSeperators) {
  tokenSeperators = tokenSeperators || [];
  var tokens = [];
  var sourcePos = 0;
  var destStart = 0;
  var destEnd = 0;

  source:
  while(sourcePos < source.length) {
    seperator:
    for(var s = 0; s < tokenSeperators.length; s++) {
      var seperator = tokenSeperators[s];
      var i;

      for(i = 0; i < seperator.length; i++) {
        if(sourcePos + i >= source.length || source.charAt(sourcePos + i) !== seperator.charAt(i)) {
          continue seperator;
        }
      }

      if(destEnd - destStart > 0) {
        tokens.push(source.substring(destStart, destEnd));
      }

      sourcePos += i;
      destStart = destEnd = sourcePos;

      continue source;
    }

    sourcePos++;
    destEnd++;
  }

  if(destEnd - destStart > 0) {
    tokens.push(source.substring(destStart, destEnd));
  }

  return tokens;
};

textglass.debug(1, 'TextGlass Javascript Client', textglass.version);
