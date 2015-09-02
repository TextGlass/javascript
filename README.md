TextGlass Javascript Client
===========================

Example
-------

```html
<script src="http://textglass.org/trunk/javascript/js/textglass.js"></script>

<script>
  var textglass = textglass || {};

  function load()
  {
    var osURL = "http://textglass.org/trunk/os/domain/patterns.json";
    var browserURL = "http://textglass.org/trunk/browser/domain/patterns.json";

    if(textglass.loaded)
    {
      textglass.loadURLs(osURL, undefined, undefined, undefined, domainReady);
      textglass.loadURLs(browserURL, undefined, undefined, undefined, domainReady);
    }
    else
    {
      alert('Error, couldn\'t load TextGlass Javascript client.');
    }
  }

  function domainReady(state, msg, domain)
  {
    if(state === 'error')
    {
      alert(msg);
    }
    else if(textglass.domains.browser && textglass.domains.os)
    {
      try
      {
          var browser = textglass.domains.browser.classify(navigator.userAgent);
          var os = textglass.domains.os.classify(navigator.userAgent);
      }
      catch(e) //fatal transformer error
      {
          alert(e);
          return;
      }

      var msg;

      if(browser.unknown)
      {
        msg = 'You are using an unknown browser.';
      }
      else
      {
        msg = 'Your browser is ' + browser.name + '.';
      }

      if(os.unknown)
      {
        msg += ' You are using an unknown operating system.';
      }
      else
      {
        msg += ' Your operating system is ' + os.name + '.';
      }

      alert(msg);
    }
  }

  load();
</script>
```
