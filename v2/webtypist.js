const keylayoutBaseURL = 'https://fabi1cazenave.github.io/x-keyboard/layouts';


/******************************************************************************
 * User Interface: layout and lesson selectors
 */

const ui = {
  // keyboard
  keyboard: null, // SVG keyboard display
  layout: null,   // layout selector
  shape: null,    // geometry selector
  hints: null,    // hints checkbox
  hands: null,    // hands diagram
  // lesson selector
  lesson: null,
  level: null,
  // timer
  accuracy: null,
  speed: null,
  // typist
  txtPrompt: null,
  txtInput: null,
};
for (const id in ui) {
  ui[id] = document.getElementById(id);
}

function populateLayoutSelector(layouts) {
  ui.layout.innerHTML = Object.entries(layouts)
    .sort(([ id1, name1 ], [ id2, name2 ]) => name1.localeCompare(name2))
    .map(([ key, name ]) => `<option value="${key}">${name}</option>`)
    .join('\n');
}

function populateLessonSelector(lessons) {
  // all options are hidden by default
  ui.lesson.innerHTML = Object.entries(lessons)
    .sort(([ k1, d1 ], [ k2, d2 ]) => d1.title.localeCompare(d2.title))
    .map(([ k, d ]) => `<option hidden value="${k}">${d.title}</option>`)
    .join('\n');
}

function populateLevelSelector(xmldoc) {
  ui.level.innerHTML = Array.from(xmldoc.getElementsByTagName('lesson'))
    .map((node, i) => `<option value="${i++}">${i}: ${
      node.getElementsByTagName('title').item(0).childNodes[0].nodeValue
    }</option>`).join('\n');
}

function getLevelByIndex(xmldoc, index) {
  const trim = /^\s+|\s+$/g;
  return index < 0 ? [] : xmldoc.getElementsByTagName('lesson').item(index)
    .getElementsByTagName('text').item(0).childNodes[0].nodeValue
    .replace(trim, '').split('\n')
    .map(line => line.replace(trim, ''));
}

function enableLessons(lessons) {
  // hide all lessons that do not apply to the current keyboard layout
  const options = Array.from(ui.lesson.children);
  options.forEach(opt => opt.hidden = (lessons.indexOf(opt.value) < 0));
  // hide the lesson selector if it offers no real choices
  ui.lesson.hidden = (options.filter(opt => !opt.hidden).length <= 1);
}

function showHints(on) {
  document.body.className = on ? 'hints' : '';
  ui.keyboard.theme       = on ? 'hints' : '';
}

function highlightKey(keyChar) {
  const keys = ui.keyboard.layout.getKeySequence(keyChar);
  const key = keys[ui.keyboard.layout.pendingDK ? 1 : 0];
  ui.hands.className = ui.keyboard.showHint(key);
}


/******************************************************************************
 * Text Input & Metrics
 */

const gTypist = (function(window, document, undefined) {
  let startDate = null;
  let typos = 0;
  let text = '';

  function start() {
    ui.txtInput.className = 'active';
    previousValue = '';
    startDate = new Date();
    typos = 0;
  }

  function stop() {
    if (!text) {
      ui.speed.textContent = '0';
      ui.accuracy.textContent = '0';
      return;
    }
    const elapsed = (new Date() - startDate) / 1000;
    ui.speed.textContent = Math.round(text.length * 60 / elapsed);
    ui.accuracy.textContent = typos;
    startDate = null; // back to idle state
  }

  function newPrompt() { // display a new exercise
    text = state.prompt;
    if (!text) {
      return;
    }
    ui.txtPrompt.value = text;
    ui.txtInput.className = '';
    ui.txtInput.value = '';
    ui.txtInput.focus();
    highlightKey(text.substr(0, 1));
  }

  // required to work around a Chrome bug, see the `keyup` listener below
  const pressedKeys = {};

  // highlight keyboard keys and emulate the selected layout
  ui.txtInput.onkeydown = (event) => {
    pressedKeys[event.code] = true;
    const pos = event.target.value.length;
    const value = ui.keyboard.keyDown(event);
    if (value) {
      if (!startDate) { // first char => start the timer
        start();
      }
      if (value === text.substr(pos, 1)) {
        // correct key: append it to the text input
        event.target.value += value;
        if (pos < text.length - 1) {
          highlightKey(text.substr(pos + 1, 1));
        } else { // finished
          stop();
          setTimeout(newPrompt, 500);
        }
      } else {
        // typo: increment the counter and flash the text input
        typos++;
        event.target.className = 'error';
        setTimeout(() => event.target.className = 'active', 250);
      }
    } else if (ui.keyboard.layout.pendingDK) { // dead key
      highlightKey(text.substr(pos, 1));
    } else if (event.code === 'Enter') { // restart on <Enter>
      event.target.value = '';
      startDate = null;
    } else if (event.code === 'Tab') { // focus the layout selector
      setTimeout(() => document.getElementById('layout').focus(), 100);
    } else {
      return true; // don't intercept special keys or key shortcuts
    }
    return false; // event has been consumed, stop propagation
  };
  ui.txtInput.addEventListener('keyup', (event) => {
    if (pressedKeys[event.code]) { // expected behavior
      ui.keyboard.keyUp(event);
      delete pressedKeys[event.code];
    } else {
      /**
       * We got a `keyup` event for a key that did not trigger any `keydown`
       * event first: this is a known bug with "real" dead keys on Chrome.
       * As a workaround, emulate a keydown + keyup. This introduces some lag,
       * which can result in a typo (especially when the "real" dead key is used
       * for an emulated dead key) -- but there's not much else we can do.
       */
      event.target.value += ui.keyboard.keyDown(event);
      setTimeout(() => ui.keyboard.keyUp(event), 100);
    }
  });

  // init
  ui.txtPrompt.value = '';
  ui.txtInput.value = '';
  ui.txtInput.focus();

  return { newPrompt };
})(this, document);


/******************************************************************************
 * State Management
 */

class State {
  constructor(lessons, layouts) {
    this._layouts = layouts; // read-only
    this._lessons = lessons; // read-only
    this._layoutID = '';
    this._lessonID = '';
    this._lessonXML = null;
    this._level = -1;
    this._levelData = [];
    this._shape = '';
    this._hints = false;
  }

  /**
   * keyboard layout & options
   */

  get layout() { return this._layoutID; }
  set layout(value) {
    if (value === this._layoutID) {
      return;
    }
    ui.layout.value = value;
    this._layoutID = value;
    fetch(`${keylayoutBaseURL}/${value}.json`)
      .then(response => response.json())
      .then(data => {
        ui.keyboard.setKeyboardLayout(data.keymap, data.deadkeys,
          data.geometry.replace('ergo', 'iso'));
        window.location.hash = value;
        // enable lessons that are compatible with this layout, hide all others
        const suitableLessons = Object.entries(this._lessons)
          .filter(([ id, data ]) => data.layouts.indexOf(value) >= 0)
          .map(([ id, data ]) => id);
        enableLessons(suitableLessons);
        if (suitableLessons.indexOf(ui.lesson.value) < 0) {
          this.lesson = suitableLessons[0];
        }
      });
  }

  get geometry() { return this._geometry; }
  set geometry(value) {
    ui.keyboard.geometry = value;
    this._geometry = value;
  }

  get hints() { return this._hints; }
  set hints(value) {
    ui.hints.checked = value;
    this._hints = value;
    showHints(value);
  }

  /**
   * lesson & level selectors
   */

  get lesson() { return this._lessonID; }
  set lesson(value) {
    if (value === this._lessonID) {
      return;
    }
    ui.lesson.value = value;
    ui.level.innerHTML = '<option> (loading\u2026) </option>';
    this._lessonID = value;
    this.level = -1;
    fetch(`./lessons/${value}.xml`)
      .then(response => response.text())
      .then(str => (new DOMParser()).parseFromString(str, 'text/xml'))
      .then(xmldoc => {
        populateLevelSelector(xmldoc);
        this._lessonXML = xmldoc;
        this.level = 0;
      });
  }

  get level() { return this._level; }
  set level(value) {
    if (value === this._level) {
      return;
    }
    ui.level.selectedIndex = value;
    this._level = value;
    this._levelData = getLevelByIndex(this._lessonXML, this._level);
    gTypist.newPrompt();
  }

  get prompt() {
    return this._levelData[Math.floor(Math.random() * this._levelData.length)];
  }
}

let state = {};
fetch(`./lessons.json`)
  .then(response => response.json())
  .then(data => {
    state = new State(data.courses, data.layouts);
    populateLessonSelector(data.courses);
    populateLayoutSelector(data.layouts);
    state.layout = window.location.hash.substr(1) || 'us';
    state.hints = true;
  });

window.addEventListener('hashchange', () => {
  state.layout = window.location.hash.substr(1);
});

ui.lesson.addEventListener('change', e => state.lesson   = e.target.value);
ui.level .addEventListener('change', e => state.level    = e.target.value);
ui.layout.addEventListener('change', e => state.layout   = e.target.value);
ui.shape .addEventListener('change', e => state.geometry = e.target.value);
ui.hints .addEventListener('change', e => state.hints    = e.target.checked);
