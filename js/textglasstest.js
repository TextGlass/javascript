var textglasstest = textglasstest || {};

if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = textglasstest;
}

textglasstest.loadURL = function(testURL, callback) {
  textglass.debug(1, 'testURL:', testURL);

  var loading = {};

  loading.status = 1;
  loading.callback = callback || function() {};

  loading.test = {};

  textglass.getURL(loading.test, loading, testURL, function() {
    if(loading.test.status === 2) {
      var fail = textglasstest.loadObject(loading.test.json);

      if(fail) {
        callback('fail', fail);
      } else {
        callback('pass')
      }
    }
  });
};

textglasstest.loadObject = function(test) {
  var domainName = test.domain;
  var domainVersion = test.domainVersion;

  if(test.type !== 'test') {
    return 'Invalid test file';
  }

  textglass.debug(1, 'Testing:', domainName, 'Version:', domainVersion);

  if(!textglass.domains[domainName]) {
    return 'Domain not found: ' + domainName;
  }

  var domain = textglass.domains[domainName];

  if(domainVersion !== domain.version) {
    return 'Domain versions do not match: ' + domainVersion;
  }

  for(var i = 0; i < test.tests.length; i++) {
    var testObj = test.tests[i];

    textglass.debug(2, 'test input', testObj.input);

    var result = domain.classify(testObj.input);

    textglass.debug(2, 'test result', result);

    if(result && (!testObj.resultPatternId) || (result && result.patternId !== testObj.resultPatternId)) {
      return 'Test failed, ' + result.patternId + ' != ' + testObj.resultPatternId;
    }

    for(var attribute in testObj.resultAttributes) {
      var value = testObj.resultAttributes[attribute];

      if(result[attribute] !== value) {
        return 'Test failed for ' + testObj.resultPatternId + '.' + attribute + ', ' + value + ' != ' + result[attribute];
      }
    }

    textglass.debug(1, 'Test passed', testObj.resultPatternId);
  }

  textglass.debug(1, 'All tests passed');
};