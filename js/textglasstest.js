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
      var pass = textglasstest.loadObject(loading.test.json);

      callback(pass ? 'pass' : 'fail');
    }
  });
};

textglasstest.loadObject = function(test) {
  textglass.debug(2, "textclasstest.loadObject", test);
};