These layouts have been created from scratch, the XML syntax should be self-explanatory.  Most of the time, the `name` attributes correspond to the XKB name of the key.

All files must be encoded in utf-8, **WITHOUT BOM**.
Four characters have to be escaped to keep files XML-compliant:
* `"` ⇒ `&quot;` (or use single-quote delimiters)
* `&` ⇒ `&amp;`
* `<` ⇒ `&lt;`
* `>` ⇒ `&gt;`

Other interesting layouts that could be supported:
* German dvorak-like layouts:
  [Ristome](http://www.ristome.de/),
  [de-ergo](http://forschung.goebel-consult.de/de-ergo),
  [eMeier](http://www.dingo.saar.de/Bilder/de-emeier.html),
  [NEO](http://pebbles.schattenlauf.de/layout/index_us.html)
* Multi-purpose qwerty-like layout:
  [EUR-key](http://eurkey.steffen.bruentjen.eu/)

