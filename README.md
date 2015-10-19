TextGlass Javascript Client
===========================

Download
--------

Trunk: http://textglass.org/trunk/javascript/js/textglass.js

1.0.0: ...

Example
-------

```html
<script src="http://textglass.org/trunk/javascript/js/textglass.js"></script>

<script>
  var textglass = textglass || {};

  function load()
  {
    var osURL = 'http://textglass.org/trunk/os/domain/patterns.json';
    var browserURL = 'http://textglass.org/trunk/browser/domain/patterns.json';

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

API
---

##### textglass.loadURLs(patternURL, attributeURL, patternPatchURL, attributePatchURL, readyCallback)

&nbsp;&nbsp; **patternURL** - pattern file URL  
&nbsp;&nbsp; **attributeURL** - attribute file URL  
&nbsp;&nbsp; **patternPatchURL** - pattern patch file URL  
&nbsp;&nbsp; **attributePatchURL** - attribute patch file URL  
&nbsp;&nbsp; **readyCallback** - see textglass.interface.readyCallback

&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp; Loads a domain from URL. readyCallback is called when ready or on error.

&nbsp;&nbsp; **_Return value_**  
&nbsp;&nbsp;&nbsp;&nbsp; None

##### textglass.loadObjects(pattern, attribute, patternPatch, attributePatch)

&nbsp;&nbsp; **pattern** - pattern object  
&nbsp;&nbsp; **attribute** - attribute object  
&nbsp;&nbsp; **patternPatch** - pattern patch object  
&nbsp;&nbsp; **attributePatch** - attribute patch object

&nbsp;&nbsp; **_Description_**
&nbsp;&nbsp;&nbsp;&nbsp; Loads a domain from Javascript JSON objects.

&nbsp;&nbsp; **_Return value_**
&nbsp;&nbsp;&nbsp;&nbsp; See textglass.interface.domain

