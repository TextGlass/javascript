var textglass = textglass || (require ? require('./textglass') : {});

var textglasstest = (function(textglasstest, textglass) {
  textglasstest.loadURL = function(testURL, callback) {
    textglass.debug(1, 'testURL:', testURL);

    var loading = {};

    loading.status = 1;
    loading.callback = callback || function() {};

    loading.test = {};

    textglass.getURL(loading.test, loading, testURL, function() {
      if(loading.test.status === 2) {
        var ret = textglasstest.loadObject(loading.test.json);

        if(!ret || ret.error) {
          callback('error', ret ? ret.msg : 'Unknown error');
        } else {
          callback('pass', ret.msg);
        }
      }
    });
  };

  textglasstest.loadObject = function(test) {
    var start = Date.now();

    var domainName = test.domain;
    var domainVersion = test.domainVersion;

    if(test.type !== 'test') {
      return {error: true, msg: 'Invalid test file'};
    }

    textglass.debug(1, 'Testing:', domainName, 'Version:', domainVersion);

    if(!textglass.domains[domainName]) {
      return {error: true, msg: 'Domain not found: ' + domainName};
    }

    var domain = textglass.domains[domainName];

    if(domainVersion !== domain.version) {
      return {error: true, msg: 'Domain versions do not match: ' + domainVersion};
    }

    var i;

    for(i = 0; i < test.tests.length; i++) {
      var testObj = test.tests[i];

      textglass.debug(2, 'test input', testObj.input);

      var result = domain.classify(testObj.input);

      textglass.debug(2, 'test result', result);

      if((!result && testObj.resultPatternId) || (result && !testObj.resultPatternId) ||
          (result && result.patternId !== testObj.resultPatternId)) {
        return {error: true, msg: 'Test failed, ' + (result ? result.patternId : result) + ' != ' + testObj.resultPatternId};
      }

      for(var attribute in testObj.resultAttributes) {
        var value = testObj.resultAttributes[attribute];
        var expected = result ? result[attribute] : undefined;

        if(expected !== value) {
          return {error: true, msg: 'Test failed for ' + testObj.resultPatternId + '.' + attribute + ', ' + value + ' != ' + expected};
        }
      }

      textglass.debug(1, 'Test passed', testObj.resultPatternId);
    }

    var end = Date.now() - start;

    textglass.debug(1, 'All tests passed');

    return {
      msg: 'All tests passed (' + i + '), time: ' + end + 'ms'
    };
  };

  return textglasstest;
})(textglasstest || {}, textglass || {});

if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = textglasstest;
}
