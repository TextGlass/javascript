var textglass = textglass || {};

if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = textglass;
}

textglass.version = '1.0.0';
textglass.debugLevel = textglass.debugLevel || -1;

textglass.domains = {};

textglass.debug = textglass.debug || function(level, s) {
  if(level <= textglass.debugLevel) {
    var params = Array.prototype.slice.call(arguments, 0);
    params[0] = 'TextGlass ' + level + ':';
    console.log.apply(console, params);
  }
};

textglass.loadURLs = function(patternURL, attributeURL, patternPatchURL, attributePatchURL, callback) {
  textglass.debug(1, 'patternURL:', patternURL);
  textglass.debug(1, 'attributeURL:', attributeURL);
  textglass.debug(1, 'patternPatchURL:', patternPatchURL);
  textglass.debug(1, 'attributePatchURL:', attributePatchURL);

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

  textglass.getURL(loading.pattern, loading, patternURL);

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

textglass.getURL = function(loadobj, parent, url, ready) {
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

      if(ready) {
        ready(loadobj.parent);
      } else {
        textglass.readyToLoad(loadobj.parent);
      }
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

  for(var name in loading) {
    var loadobj = loading[name];
    if(loadobj.url && loadobj.status !== 2) {
      return;
    }
  }

  var ret = textglass.loadObjects(loading.pattern.json, loading.attribute.json,
      loading.patternPatch.json, loading.attributePatch.json);

  if(!ret || ret.error) {
    loading.callback('error', ret ? ret.msg : 'Unknown error', ret.domain ? ret.domain : undefined);
    return;
  }

  loading.callback('ready', ret.msg, ret.domain);
};

textglass.loadObjects = function(pattern, attribute, patternPatch, attributePatch) {
  var domainName = pattern.domain;
  var domainVersion = pattern.domainVersion;

  if(pattern.type !== 'pattern') {
    return {error: true, msg: 'Invalid pattern file'};
  }
  
  if(attribute) {
    if(attribute.type !== 'attribute' || attribute.domain !== domainName ||
        attribute.domainVersion !== domainVersion || !attribute.attributes) {
      return {error: true, msg: 'Invalid attribute file'};
    }
  }

  textglass.debug(1, 'Loading:', domainName, 'Version:', domainVersion);

  if(textglass.domains[domainName]) {
    return {error: true, msg: 'Domain already loaded', domain: domainName};
  }

  var domain = {};
  textglass.domains[domainName] = domain;

  if(!pattern.inputParser) {
    pattern.inputParser = {};
  }

  if(pattern.inputParser.transformers && pattern.inputParser.transformers.length > 0) {
    var error = textglass.compileTransformers(pattern.inputParser);

    if(error) {
      return error;
    }
  }

  pattern.patternIndex = {};

  for(var i = 0; i < pattern.patternSet.patterns.length; i++) {
    var patternObj = pattern.patternSet.patterns[i];

    patternObj.rank = textglass.getPatternRank(patternObj);

    textglass.debug(3, 'Found pattern:', patternObj.patternId,
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

  var attributeCount = 0;

  if(pattern.attributes) {
    if(!attribute) {
      attribute = {attributes: pattern.attributes};
    } else {
      for(var name in pattern.attributes) {
        var pattribute = pattern.attributes[name];
        if(!attribute.attributes[name]) {
          attribute.attributes[name] = pattribute;
        }
      }
    }
  }

  if(attribute) {
    for(var name in attribute.attributes) {
      var attributeObj = attribute.attributes[name];

      textglass.debug(3, 'Found attribute:', name, 'attributes:', !!attributeObj.attributes,
          'attributeTransformers:', !!attributeObj.attributeTransformers);

      if(attributeObj.attributeTransformers) {
        for(var transformedName  in attributeObj.attributeTransformers) {
          var transformedAttribute = attributeObj.attributeTransformers[transformedName];

          var error = textglass.compileTransformers(transformedAttribute);

          if(error) {
            return error;
          }
        }
      }
          
      attributeCount++;
    }
  }

  domain.name = domainName;
  domain.version = domainVersion;
  domain.pattern = pattern;
  domain.attribute = attribute || {attributes:{}};
  domain.classify = function(input) {
    return textglass.classify(domain, input);
  };

  return {
    msg: 'Loaded ' + domainName + ', version: ' + domainVersion +
        ', patterns: ' + domain.pattern.patternSet.patterns.length + ', attributes: ' + attributeCount,
    domain: domainName,
    domainVersion: domainVersion
  };
};

textglass.classify = function(domain, input) {
  textglass.debug(1, 'classify() domain', domain.name);
  textglass.debug(1, 'classify() input', input);

  if(domain.pattern.inputParser.compiledTransformers) {
    for(var i = 0; i < domain.pattern.inputParser.compiledTransformers.length; i++) {
      var compiledTransformer = domain.pattern.inputParser.compiledTransformers[i];

      input = compiledTransformer(input);

      if (typeof input === "undefined") {
        throw 'Transformer error on input';
      }
    }
  }

  textglass.debug(2, 'classify() transformed', input);

  var tokens = textglass.split(input, domain.pattern.inputParser.tokenSeperators);

  textglass.debug(2, 'classify() tokens', tokens);

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

  textglass.debug(2, 'classify() ngrams', tokenStream);

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
        if(!winner) {
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

  textglass.debug(2, 'Winner:', (winner ? winner.patternId : 'null'));

  if(winner) {
    return textglass.getAttributes(domain, winner.patternId, input);
  } else {
    return null;
  }
};

textglass.getAttributes = function(domain, patternId, input) {
  var attributesObj = domain.attribute.attributes[patternId];

  if(attributesObj) {
    var attributes = textglass.copyAttributes(attributesObj, input);
    var parent = attributesObj;

    while(parent.parentId) {
      parent = domain.attribute.attributes[parent.parentId];

      if(!parent) {
        break;
      }

      for(var parentAttribute in textglass.copyAttributes(parent, input)) {
        if(!attributes[parentAttribute]) {
          attributes[parentAttribute] = parent.attributes[parentAttribute];
        }
      }
    }

    attributes.patternId = patternId;
    
    return attributes;
  } else {
    return  {
      patternId: patternId
    };
  }
};

textglass.copyAttributes = function(attributesObj, input) {
  var copy = {};

  for(var attribute in attributesObj.attributes) {
    copy[attribute] = attributesObj.attributes[attribute];
  }

  for(var attribute in attributesObj.attributeTransformers) {
    var attributeTransformer = attributesObj.attributeTransformers[attribute];

    var value = input;

    for(var i = 0; i < attributeTransformer.compiledTransformers.length; i++) {
      var compiledTransformer = attributeTransformer.compiledTransformers[i];

      value = compiledTransformer(value);

      if (typeof value === "undefined") {
        value = attributeTransformer.defaultValue || '';
        break;
      }
    }

    copy[attribute] = value;
  }
  
  return copy;
};

textglass.isPatternValid = function(pattern, matchedTokens) {
  var lastFound = -1;

  for(var i = 0; i < pattern.patternTokens.length; i++) {
    var patternToken = pattern.patternTokens[i];

    var found = matchedTokens.indexOf(patternToken);

    if(found === -1 && (pattern.patternType === 'SimpleAnd' || pattern.patternType === 'SimpleOrderedAnd')) {
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

textglass.getMatchedLength = function(pattern, matchedTokens) {
  var length = 0;

  for(var i = 0; i < pattern.patternTokens.length; i++) {
    var patternToken = pattern.patternTokens[i];

    var found = matchedTokens.indexOf(patternToken);

    if(found >= 0) {
      length += patternToken.length;
    }
  }

  return length;
};

textglass.compileTransformers = function(node) {
  node.compiledTransformers = [];
  
  for(var i = 0; i < node.transformers.length; i++) {
    var transformer = node.transformers[i];

    textglass.debug(2, 'Found transformer:', transformer.type);

    var compiled = textglass.getTransformer(transformer);

    if(!compiled) {
      return {error: true, msg: 'Transformer not found: ' + transformer.type};
    }

    node.compiledTransformers.push(compiled);
  }
};

textglass.getTransformer = function(transformer) {
  if(transformer.type === 'LowerCase') {
    return textglass.transformers.LowerCase;
  } else if(transformer.type === 'ReplaceAll') {
    return function(input) {
      return textglass.transformers.ReplaceAll(input, transformer.parameters.find, transformer.parameters.replaceWith);
    };
  } else if(transformer.type === 'SplitAndGet') {
    return function(input) {
      return textglass.transformers.SplitAndGet(input, transformer.parameters.delimeter, transformer.parameters.get);
    };
  } else if(transformer.type === 'IsNumber') {
    return textglass.transformers.IsNumber;
  }
};

textglass.transformers = {};

textglass.transformers.LowerCase = function(input) {
  return input.toLowerCase();
};

textglass.transformers.ReplaceAll = function(input, find, replaceWith) {
  return textglass.split(input, [find]).join(replaceWith);
};

textglass.transformers.SplitAndGet = function(input, delimeter, get) {
  var parts = textglass.split(input, [delimeter]);

  if(get === -1) {
    get = parts.length - 1;
  }

  return parts[get];
};

textglass.transformers.IsNumber = function(input) {
  if(!isNaN(parseFloat(input)) && isFinite(input)) {
    return input;
  } else {
    return undefined;
  }
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

textglass.loaded = true;
