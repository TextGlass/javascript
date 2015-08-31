TextGlass Javascript Client
===========================

Example
-------

```html
<script src="http://textglass.org/javascript/js/textglass.js"></script>

<script>
  var textglass = textglass || {};

  function load()
  {
    var browserURL = "http://textglass.org/browser/domain/patterns.json";

    if(textglass.loaded)
    {
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
    else
    {
      try
      {
          var browser = textglass.domains[domain].classify(navigator.userAgent);
      }
      catch(e) //transformer error
      {
          alert(e);
          return;
      }

      if(!browser.error)
      {
        alert('Your browser is ' + browser.name +
          (browser.mobile?' (mobile)':'') +
          ' version ' + browser.version + '.');
      }
      else
      {
        alert('You are using an unknown browser.');
      }
    }
  }

  load();
</script>
```
