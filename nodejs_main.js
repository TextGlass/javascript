/*
 * Copyright (c) 2015 TextGlass
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 */

var textglass = require('./js/textglass');
var textglasstest = require('./js/textglasstest');

textglass.debugLevel = 1;

var args = process.argv.slice(2);

textglass.debug(0, 'TextGlass Javascript Client ' + textglass.version);

var pattern;
var attribute;
var patternPatch;
var attributePatch;

var tests = [];

var testString;
var warmup;

var failure = false;

//PARSE THE COMMAND LINE

for(var i = 0; i < args.length; i++) {
  var option = args[i];

  if(option === '-h') {
    printHelp();
    process.exit(0);
  } else if(option === '-p') {
    if(pattern) {
      throw 'pattern file already defined';
    }
    pattern = getParam(args, ++i, '-p file parameter missing');
  } else if(option === '-a') {
    if(attribute) {
      throw 'attribute file already defined';
    }
    attribute = getParam(args, ++i, '-a file parameter missing');
  } else if(option === '-pp') {
    if(patternPatch) {
      throw 'pattern patch file already defined';
    }
    patternPatch = getParam(args, ++i, '-pp file parameter missing');
  } else if(option === '-ap') {
    if(attributePatch) {
      throw 'attribute patch file already defined';
    }
    attributePatch = getParam(args, ++i, '-ap file parameter missing');
  } else if(option  === '-t') {
    tests.push(getParam(args, ++i, '-t file parameter missing'));
  } else if(option.indexOf('-') !== 0 && !testString) {
    testString = option;
  } else if(option === '-w') {
    warmup = getParam(args, ++i, '-w iterations missing');
  } else if(option === '-q') {
    textglass.debugLevel = 0;
  } else if(option === '-v') {
    textglass.debugLevel = 2;
  } else if(option === '-vv') {
    textglass.debugLevel = 3;
  } else {
    printHelp();
    throw 'unknown option: ' + option;
  }
}

if(!pattern) {
  printHelp();
  throw 'Pattern file required';
}

if(warmup > 0) {
  runWarmup(warmup, pattern, patternPatch, attribute, attributePatch, tests);
}

textglass.debug(1, 'Pattern file: \'' + pattern + '\'');

if(patternPatch) {
  textglass.debug(1, 'Pattern patch file: \'' + patternPatch + '\'');
}

if(attribute) {
  textglass.debug(1, 'Attribute file: \'' + attribute + '\'');
}

if(attributePatch) {
  textglass.debug(1, 'Attribute patch file: \'' + attributePatch + '\'');
}

//BUILD THE TEXTGLASS CLIENT

var start = Date.now();

var patternFile = require('./' + pattern);
var attributeFile = attribute ? require('./' + attribute) : undefined;
var patternPatchFile = patternPatch ? require('./' + patternPatch) : undefined;
var attributePatchFile = attributePatch ? require('./' + attributePatch) : undefined;

var result = textglass.loadObjects(patternFile, attributeFile, patternPatchFile, attributePatchFile);

var time = Date.now() - start;

if(!result || result.error) {
  throw result ? result.msg : 'Unknown error';
}

textglass.debug(1, result.msg);

textglass.debug(0, 'Domain load time: ' + time + 'ms');

//DO THE TESTS

for(var i = 0; i < tests.length; i++) {
  var test = tests[i];
  
  textglass.debug(1, 'Test file: \'' + test + '\'');

  var testFile = require('./' + test);

  var testResult = textglasstest.loadObject(testFile);

  if(!testResult || testResult.error) {
    failure = true;
  }

  if(testResult && testResult.msg) {
    textglass.debug(0, testResult.msg);
  }
}

if(testString) {
  textglass.debug(1, 'Test string: \'' + testString + '\'');

  var start = Date.now();

  var testResult = textglass.domains[result.domain].classify(testString);

  var time = Date.now() - start;

  textglass.debug(0, 'Test result:', testResult);

  textglass.debug(0, 'Test time: ' + time + 'ms');
}

if(failure) {
  throw 'One or more tests failed';
}

function printHelp() {
  textglass.debug(0, 'Usage: ' + process.argv[1] + ' [OPTIONS] [STRING]\n');
  textglass.debug(0, '  -p <file>            load TextGlass pattern file (REQUIRED)');
  textglass.debug(0, '  -a <file>            load TextGlass attribute file');
  textglass.debug(0, '  -pp <file>           load TextGlass pattern patch file');
  textglass.debug(0, '  -ap <file>           load TextGlass attribute patch file');
  textglass.debug(0, '  -t <file>            load TextGlass test file');
  textglass.debug(0, '  -h                   print help');
  textglass.debug(0, '  -w <iterations>      run warmup');
  textglass.debug(0, '  -q                   quiet');
  textglass.debug(0, '  -v                   verbose');
  textglass.debug(0, '  -vv                  very verbose');
  textglass.debug(0, '  STRING               test string');
  textglass.debug(0, '');
}

function getParam(args, pos, error) {
  if(pos >= args.length) {
    throw error;
  } else if(!args[pos] || args[pos].indexOf('-') === 0) {
    throw error;
  } else {
    return args[pos];
  }
}

function runWarmup(warmup, pattern, patternPatch, attribute, attributePatch, tests) {
  textglass.debug(0, 'Warmup ' + warmup + ' iterations(s)...');

  var origDebug = textglass.debugLevel;
  textglass.debugLevel = -1;

  var iterations = 0;

  while(iterations < warmup) {
    var patternFile = require('./' + pattern);
    var attributeFile = attribute ? require('./' + attribute) : undefined;
    var patternPatchFile = patternPatch ? require('./' + patternPatch) : undefined;
    var attributePatchFile = attributePatch ? require('./' + attributePatch) : undefined;

    var result = textglass.loadObjects(patternFile, attributeFile, patternPatchFile, attributePatchFile);

    for(var i = 0; i < tests.length; i++) {
      var test = tests[i];

      var testFile = require('./' + test);

      textglasstest.loadObject(testFile);
    }

    delete textglass.domains[result.domain];

    iterations++;
  }

  textglass.debugLevel = origDebug;

  textglass.debug(0, 'Warmup completed');
}
