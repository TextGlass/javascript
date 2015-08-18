var textglass = (function(textglass) {
  textglass.version = '1.0.0 alpha';
  textglass.debugLevel = textglass.debugLevel || -1;

  textglass.domains = {};

  textglass.debug = textglass.debug || function(level, s) {
    if(level <= textglass.debugLevel) {
      var params = Array.prototype.slice.call(arguments, 0);
      params[0] = 'TextGlass: ';
      for(var i = 0; i < level; i++) {
        params[0] += '  ';
      }
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
    loading.start = Date.now();

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
    textglass.debug(1, 'Getting url:', url);
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
          loadError(loadobj, 'JSON parse error: ' + e);
          return;
        }

        if(loadobj.json.TextGlassSpecVersion !== 1.0) {
          loadError(loadobj, 'Invalid TextGlassSpecVersion found');
          return;
        }

        loadobj.status = 2;

        if(ready) {
          ready(loadobj.parent);
        } else {
          readyToLoad(loadobj.parent);
        }
      } else {
        var msg = 'Bad response code ' + loadobj.request.status + ' for ' + loadobj.url;
        loadError(loadobj, msg);
      }
    };

    loadobj.request.onerror = function() {
      var msg = 'Error for ' + loadobj.url;
      loadError(loadobj, msg);
    };

    loadobj.request.send();
  };

  function loadError(loadobj, msg) {
    textglass.debug(0, 'loadError()', msg);

    if(loadobj.parent.status > 0) {
      loadobj.parent.callback('error', msg);
    }

    loadobj.status = -1;
    loadobj.parent.status = -1;
  }

  function readyToLoad(loading) {
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

    loading.pattern.json._diff = Date.now() - loading.start;

    var ret = textglass.loadObjects(loading.pattern.json, loading.attribute.json,
        loading.patternPatch.json, loading.attributePatch.json);

    if(!ret || ret.error) {
      loading.callback('error', ret ? ret.msg : 'Unknown error', ret.domain ? ret.domain : undefined);
      return;
    }

    loading.callback('ready', ret.msg, ret.domain);
  }

  textglass.loadObjects = function(pattern, attribute, patternPatch, attributePatch) {
    var start = Date.now();

    var domainName = pattern.domain;
    var domainVersion = pattern.domainVersion;

    if(pattern.type !== 'pattern' || !pattern.patternSet || pattern.TextGlassSpecVersion !== 1.0) {
      return {error: true, msg: 'Invalid pattern file'};
    }

    if(attribute) {
      if(attribute.type !== 'attribute' || attribute.domain !== domainName ||
          attribute.domainVersion !== domainVersion || !attribute.attributes ||
          attribute.TextGlassSpecVersion !== 1.0) {
        return {error: true, msg: 'Invalid attribute file'};
      }
    }

    if(patternPatch) {
      if(patternPatch.type !== 'patternPatch' || patternPatch.domain !== domainName ||
          patternPatch.domainVersion !== domainVersion || !patternPatch.patternSet ||
          patternPatch.TextGlassSpecVersion !== 1.0) {
        return {error: true, msg: 'Invalid pattern patch file'};
      }
    }

    if(attributePatch) {
      if(attributePatch.type !== 'attributePatch' || attributePatch.domain !== domainName ||
          attributePatch.domainVersion !== domainVersion || !attributePatch.attributes ||
          attributePatch.TextGlassSpecVersion !== 1.0) {
        return {error: true, msg: 'Invalid attribute patch file'};
      }
    }

    textglass.debug(1, 'Loading:', domainName, 'Version:', domainVersion);

    if(textglass.domains[domainName]) {
      return {error: true, msg: 'Domain already loaded', domain: domainName};
    }

    var domain = {};

    if(!pattern.inputParser) {
      pattern.inputParser = {};
    }

    if(patternPatch && patternPatch.inputParser) {
      if(patternPatch.inputParser.transformers) {
        pattern.inputParser.transformers = patternPatch.inputParser.transformers;
      }

      if(patternPatch.inputParser.tokenSeperators) {
        pattern.inputParser.tokenSeperators = patternPatch.inputParser.tokenSeperators;
      }

      if(patternPatch.inputParser.ngramConcatSize) {
        pattern.inputParser.ngramConcatSize = patternPatch.inputParser.ngramConcatSize;
      }
    }

    if(pattern.inputParser.transformers && pattern.inputParser.transformers.length > 0) {
      var error = compileTransformers(pattern.inputParser);

      if(error) {
        return error;
      }
    }

    pattern.patternIndex = {};

    for(var p = 0; p < 2; p++)
    {
      var patterns = [];

      if(!p && pattern.patternSet.patterns) {
        patterns = pattern.patternSet.patterns;
      } else if(patternPatch && patternPatch.patternSet.patterns) {
        patterns = patternPatch.patternSet.patterns;
      }

      for(var i = 0; i < patterns.length; i++) {
        var patternObj = patterns[i];

        if(patternObj.rankType !== 'Strong' && patternObj.rankType !== 'Weak' &&
            patternObj.rankType !== 'None') {
          return {error: true, msg: 'Invalid rankType: ' + patternObj.rankType};
        }

        if(patternObj.patternType !== 'Simple' && patternObj.patternType !== 'SimpleAnd' &&
            patternObj.patternType !== 'SimpleOrderedAnd') {
          return {error: true, msg: 'Invalid patternType: ' + patternObj.patternType};
        }

        patternObj.rank = getPatternRank(patternObj);

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
    }

    if(patternPatch && patternPatch.patternSet.defaultId) {
      pattern.patternSet.defaultId = patternPatch.patternSet.defaultId;
    }

    var attributeCount = 0;

    if(!attribute) {
      attribute = {attributes: (pattern.attributes ? pattern.attributes : {})};
    }

    if(pattern.attributes) {
      for(var name in pattern.attributes) {
        if(!attribute.attributes[name]) {
          attribute.attributes[name] = pattern.attributes[name];
        }
      }
    }

    if(patternPatch && patternPatch.attributes) {
      for(var name in patternPatch.attributes) {
        if(!attribute.attributes[name]) {
          attribute.attributes[name] = patternPatch.attributes[name];
        }
      }
    }

    if(attributePatch) {
      for(var name in attributePatch.attributes) {
        attribute.attributes[name] = attributePatch.attributes[name];
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

            var error = compileTransformers(transformedAttribute);

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
    domain.attribute = attribute;
    domain.classify = function(input) {
      return textglass.classify(domain, input);
    };

    textglass.domains[domainName] = domain;

    var end = Date.now() - start;

    return {
      msg: 'Loaded ' + domainName + ', version: ' + domainVersion +
          ', patterns: ' + domain.pattern.patternSet.patterns.length +
          ', attributes: ' + attributeCount + ', time: ' + end + 'ms' +
          (pattern._diff ? ' (' + pattern._diff + 'ms)' : ''),
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

        if (typeof input === 'undefined') {
          throw 'Transformer error on input';
        }
      }
    }

    textglass.debug(2, 'classify() transformed', input);

    var tokens = split(input, domain.pattern.inputParser.tokenSeperators);

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

        textglass.debug(3, 'Hit:', token, 'candidates:', matched);
      }
    }

    if(!winner) {
      for(var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];

        if(isPatternValid(candidate, matchedTokens)) {
          textglass.debug(2, 'candidate:', candidate);

          if(!winner) {
            winner = candidate;
          } else if(candidate.rank > winner.rank) {
            winner = candidate;
          } else if(candidate.rank === winner.rank &&
              getMatchedLength(candidate, matchedTokens) > getMatchedLength(winner, matchedTokens)) {
            winner = candidate;
          }
        }
      }
    }

    textglass.debug(2, 'Winner:', (winner ? winner.patternId : 'null'));

    if(winner) {
      return getAttributes(domain, winner.patternId, input);
    } else if(domain.pattern.patternSet.defaultId) {
      return getAttributes(domain, domain.pattern.patternSet.defaultId, input);
    } else {
      return null;
    }
  };

  function getAttributes(domain, patternId, input) {
    var attributesObj = domain.attribute.attributes[patternId];

    if(attributesObj) {
      var attributes = copyAttributes(attributesObj, input);
      var parent = attributesObj;

      while(parent.parentId) {
        parent = domain.attribute.attributes[parent.parentId];

        if(!parent) {
          break;
        }

        var parentAttributes = copyAttributes(parent, input);

        for(var parentAttribute in parentAttributes) {
          if(!attributes[parentAttribute]) {
            attributes[parentAttribute] = parentAttributes[parentAttribute];
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
  }

  function copyAttributes(attributesObj, input) {
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

        if (typeof value === 'undefined') {
          value = attributeTransformer.defaultValue || '';
          break;
        }
      }

      copy[attribute] = value;
    }

    return copy;
  }

  function isPatternValid(pattern, matchedTokens) {
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
  }

  function getPatternRank(pattern) {
    var rank = pattern.rankValue || 0;

    if(pattern.rankType === 'Weak') {
      rank += 100000;
    } else if(pattern.rankType === 'Strong') {
      return 10000000;
    }

    return rank;
  }

  function getMatchedLength(pattern, matchedTokens) {
    var length = 0;

    for(var i = 0; i < pattern.patternTokens.length; i++) {
      var patternToken = pattern.patternTokens[i];

      var found = matchedTokens.indexOf(patternToken);

      if(found >= 0) {
        length += patternToken.length;
      }
    }

    return length;
  }

  function compileTransformers(node) {
    node.compiledTransformers = [];

    for(var i = 0; i < node.transformers.length; i++) {
      var transformer = node.transformers[i];

      var compiled = getTransformer(transformer);

      if(!compiled) {
        return {error: true, msg: 'Transformer not found: ' + transformer.type};
      }

      node.compiledTransformers.push(compiled);
    }
  }

  function getTransformer(transformer) {
    if(transformer.type === 'LowerCase') {
      return t_LowerCase;
    } else if(transformer.type === 'UpperCase') {
      return t_UpperCase;
    } else if(transformer.type === 'ReplaceFirst') {
      return function(input) {
        return t_ReplaceFirst(input, transformer.parameters.find, transformer.parameters.replaceWith);
      };
    } else if(transformer.type === 'ReplaceAll') {
      return function(input) {
        return t_ReplaceAll(input, transformer.parameters.find, transformer.parameters.replaceWith);
      };
    } else if(transformer.type === 'SplitAndGet') {
      return function(input) {
        return t_SplitAndGet(input, transformer.parameters.delimiter, transformer.parameters.get);
      };
    } else if(transformer.type === 'Substring') {
      return function(input) {
        return t_Substring(input, transformer.parameters.start, transformer.parameters.maxLength);
      };
    } else if(transformer.type === 'IsNumber') {
      return t_IsNumber;
    }
  }

  function t_LowerCase(input) {
    return input.toLowerCase();
  }

  function t_UpperCase(input) {
    return input.toUpperCase();
  }

  function t_ReplaceFirst(input, find, replaceWith) {
    var pos = input.indexOf(find);

    if(pos > 0) {
      return input.substring(0, pos) + replaceWith + input.substring(pos + find.length);
    }

    return input;
  }

  function t_ReplaceAll(input, find, replaceWith) {
    var pos = input.indexOf(find);

    while(pos >= 0) {
      input = input.substring(0, pos) + replaceWith + input.substring(pos + find.length);

      pos = input.indexOf(find, pos + replaceWith.length);
    }

    return input;
  }

  function t_SplitAndGet(input, delimiter, get) {
    var parts = split(input, [delimiter]);

    if(get === -1) {
      get = parts.length - 1;
    }

    return parts[get];
  }

  function t_Substring(input, start, maxLength) {
    maxLength = maxLength || -1;

    if(start >= input.length) {
      return undefined;
    }

    if(maxLength >= 0 && (maxLength + start) <= input.length) {
      return input.substring(start, maxLength + start);
    }

    return input.substring(start);
  }

  function t_IsNumber(input) {
    if(!isNaN(parseFloat(input)) && isFinite(input)) {
      return input;
    } else {
      return undefined;
    }
  }

  function split(source, tokenSeperators) {
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
  }

  textglass.loaded = true;

  return textglass;
})(textglass || {});

var module = module || undefined;

if(typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
  module.exports = textglass;
}
