Web Typist
================================================================================

Online touch-typing tutor.


Live Version
--------------------------------------------------------------------------------

https://OneDeadKey.github.io/webtypist/

Technically outdated (works with IE6!) but still working. It should be on par with [KTouch][1].


V2 Preview (work in progress)
--------------------------------------------------------------------------------

https://OneDeadKey.github.io/webtypist/v2/

This version is built on the [x-keyboard][3] component, which brings two new features:

- dead keys are properly detected, and visual hints are displayed to help mastering these dead keys — this is especially useful with Latin languages (French, Italian, Spanish, Portuguese, Romanian…) or with some keyboard layouts such as Qwerty-intl;
- keyboard layouts can be fully emulated — you can *try* a new layout without installing it on your computer.

This newer version relies on the following web standards:

- ES6 classes & modules;
- [web components][6]: custom elements + shadow DOM + HTML templates;
- [KeyboardEvent][7]’s experimental [code][8] property for the keyboard emulation.

Nowadays, this means it should work with any browser except IE and Edge. As Microsoft is deprecating IE and switching Edge to the Blink engine, all desktop browsers should be supported soon. Until then, the V1 is still there.


Typing Lessons
--------------------------------------------------------------------------------

Both V1 and V2 use KTouch lecture files. [Please refer to the documentation][2].

If you contribute a lesson here, please consider submitting it to the [KTouch][1] project as well (and vice-versa).


Keyboard Layouts
--------------------------------------------------------------------------------

The V2 uses [Kalamine][4] keyboard layouts. This keyboard layout manager makes it easy to handle dead keys and/or an AltGr layer, and generates drivers for Windows, MacOSX and Linux — along with a JSON output that is parsed by WebTypist.

The V1 uses a specific XML format that I don’t intend to keep.


Credits
--------------------------------------------------------------------------------

This project reuses [KTouch][1]’s lessons and some [Klavaro][5] visuals.

  [1]: https://edu.kde.org/ktouch/
  [2]: https://edu.kde.org/ktouch/kde4/ktouch-lectures.php
  [3]: https://github.com/OneDeadKey/x-keyboard/
  [4]: https://github.com/OneDeadKey/kalamine/
  [5]: https://sourceforge.net/projects/klavaro/
  [6]: https://developer.mozilla.org/en-US/docs/Web/Web_Components
  [7]: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
  [8]: https://www.w3.org/TR/uievents-code/#code-value-tables
