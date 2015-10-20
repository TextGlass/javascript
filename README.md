TextGlass Javascript Client
===========================

Download
--------

Trunk: http://textglass.org/trunk/javascript/js/textglass.js

1.0.0: ...

API
---

* `textglass.loadURLs(patternURL, attributeURL, patternPatchURL, attributePatchURL, readyCallback)`

&nbsp;&nbsp;&nbsp;&nbsp; **patternURL** - pattern file URL  
&nbsp;&nbsp;&nbsp;&nbsp; **attributeURL** - attribute file URL  
&nbsp;&nbsp;&nbsp;&nbsp; **patternPatchURL** - pattern patch file URL  
&nbsp;&nbsp;&nbsp;&nbsp; **attributePatchURL** - attribute patch file URL  
&nbsp;&nbsp;&nbsp;&nbsp; **readyCallback** - see textglass.readyCallback

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Function

&nbsp;&nbsp;&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Loads a domain from URL. readyCallback is called when ready or on error.

&nbsp;&nbsp;&nbsp;&nbsp; **_Return value_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; None

* `textglass.readyCallback(state, msg, domain)`

&nbsp;&nbsp;&nbsp;&nbsp; **state** - state string, either 'error' or 'ready'  
&nbsp;&nbsp;&nbsp;&nbsp; **msg** - message string  
&nbsp;&nbsp;&nbsp;&nbsp; **domain** - domain name string

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Function

&nbsp;&nbsp;&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; This is the callback for textglass.loadURLs().

* `textglass.loadObjects(pattern, attribute, patternPatch, attributePatch)`

&nbsp;&nbsp;&nbsp;&nbsp; **pattern** - pattern object  
&nbsp;&nbsp;&nbsp;&nbsp; **attribute** - attribute object  
&nbsp;&nbsp;&nbsp;&nbsp; **patternPatch** - pattern patch object  
&nbsp;&nbsp;&nbsp;&nbsp; **attributePatch** - attribute patch object

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Function

&nbsp;&nbsp;&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Loads a domain from Javascript JSON objects.

&nbsp;&nbsp;&nbsp;&nbsp; **_Return value_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; domain object

* `textglass.domains`

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Object

&nbsp;&nbsp;&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Mapping of domain names and domain objects

* `textglass.domains.[domain]`

&nbsp;&nbsp;&nbsp;&nbsp; **name** - domain name string  
&nbsp;&nbsp;&nbsp;&nbsp; **version** - domain version string  
&nbsp;&nbsp;&nbsp;&nbsp; **classify** - function, see textglass.domains.[domain].classify(input)  
&nbsp;&nbsp;&nbsp;&nbsp; **error** - boolean, set to true if textglass.loadObjects() fails  
&nbsp;&nbsp;&nbsp;&nbsp; **msg** - message string for textglass.loadObjects()

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Object

* `textglass.domains.[domain].classify(input)`

&nbsp;&nbsp;&nbsp;&nbsp; **input** - string to classify against domain

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Function

&nbsp;&nbsp;&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Classifies a string against a domain.

&nbsp;&nbsp;&nbsp;&nbsp; **_Return value_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Attribute map (object)

* `textglass.loaded`

&nbsp;&nbsp;&nbsp;&nbsp; **_Type_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Boolean

&nbsp;&nbsp;&nbsp;&nbsp; **_Description_**  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; True when textglass has been loaded.

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
