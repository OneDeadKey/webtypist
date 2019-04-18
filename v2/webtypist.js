/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Web Typist
 * a free, web-based, simple touch-typing tutor
 */

var eventList = [];
function triggerEvent(eventName) {
  var evtObject = eventList[eventName];
  if (!evtObject) {
    evtObject = document.createEvent('Event');
    evtObject.initEvent(eventName, false, false);
    eventList[eventName] = evtObject;
  }
  window.dispatchEvent(evtObject);
}


/******************************************************************************
 * Keyboard Display
 */

var gKeyboard = (function(window, document, undefined) {
  var layoutId = '';
  var keyPressStyle = '';
  var ui = {
    layout: null,
    variant: null,
    keyboard: null,
    shape: null,
    hints: null,
    hands: null
  }; // ui.activeKey and ui.activeMod are added dynamically

  function init() {
    for (var id in ui) {
      ui[id] = document.getElementById(id);
    }
    ui.keyboard = document.querySelector('x-keyboard');

    ui.layout.addEventListener('change', (e) => setLayout(e.target.value));
    ui.shape.addEventListener('change', (e) => setShape(e.target.value));
    ui.hints.addEventListener('change', () => showHints(ui.hints.checked));

    var kbLayout = window.location.hash.substring(1) ||
      localStorage.getItem('kbLayout') || 'qwerty';
    setLayout(kbLayout);
    setShape(localStorage.getItem('kbShape') || 'ansi');
    showHints(localStorage.getItem('kbHints') != 'off');
  }

  function setShape(value) {
    localStorage.setItem('kbShape', value);
    ui.keyboard.shape = value;
    ui.shape.value = value;
  }

  function showHints(on) {
    document.body.className = on ? 'hints' : '';
    ui.keyboard.theme       = on ? 'hints' : '';
    ui.hints.checked = on;
    keyPressStyle = on ?
      'color: white; background-color: black;' : 'background-color: #aaf;';
    localStorage.setItem('kbHints', (on ? 'on' : 'off'));
  }

  function setLayout(kbLayout) {
    fetch(`layouts/${kbLayout}.json`)
      .then(response => response.json())
      .then(data => {
        ui.keyboard.setKalamineLayout(data.layout, data.dead_keys);
        localStorage.setItem('kbLayout', kbLayout);
      });
  }

  function highlightKey(keyChar) {
    const keys = ui.keyboard.layout.getKeySequence(keyChar);
    const key = keys[ui.keyboard.layout.pendingDK ? 1 : 0];
    ui.hands.className = ui.keyboard.showHint(key);
  }

  return {
    init,
    get layout() { return layoutId; },
    set layout(value) { setLayout(value); },
    keyUp:   (code) => ui.keyboard.keyUp(code),
    keyDown: (code) => ui.keyboard.keyDown(code),
    highlightKey
  };
})(this, document);


/******************************************************************************
 * Typing Lessons (aka KTouchLecture)
 */

var gLessons = (function(window, document, undefined) {
  var lessonsDoc = null;
  var currentLevel = -1;
  var ui = {
    lesson: null,
    level: null,
    output: null
  };

  function init() {
    for (var id in ui) {
      ui[id] = document.getElementById(id);
    }
    ui.lesson.addEventListener('change', (e) => setLesson(e.target.value));
    ui.level.addEventListener('change', (e) => setLevel(e.target.value));
    setLesson(localStorage.getItem('lessonName') || 'english',
              localStorage.getItem('lessonLevel'));
  }

  function setLesson(lessonName, levelIndex) {
    ui.level.innerHTML = '<option> (loading\u2026) </option>';
    fetch(`../lessons/${lessonName}.ktouch.xml`)
      .then(response => response.text())
      .then(str => (new DOMParser()).parseFromString(str, 'text/xml'))
      .then(xmldoc => {
        lessonsDoc = xmldoc;

        // fill the lesson selector
        let i = 0, innerHTML = '';
        Array.from(xmldoc.getElementsByTagName('Level')).forEach(node => {
          let name = node.getElementsByTagName('NewCharacters')
            .item(0).childNodes[0].nodeValue;
          innerHTML += `<option value="${i++}">${i}: ${name}</option>`;
        });
        ui.level.innerHTML = innerHTML;

        // set the difficulty level
        setLevel(levelIndex);

        // update the form selector
        localStorage.setItem('lessonName', lessonName);
        ui.lesson.value = lessonName;
      });
  }

  function setLevel(levelIndex) {
    levelIndex = levelIndex || 0;
    ui.level.value = levelIndex;
    localStorage.setItem('lessonLevel', levelIndex);
    triggerEvent('lessonchange');
  }

  function getPrompt() {
    var index = ui.level.selectedIndex;
    if (index < 0) {
      return;
    }
    // select a random line in the current level
    var lines = lessonsDoc.getElementsByTagName('Level').item(index)
                          .getElementsByTagName('Line');
    var i = Math.floor(Math.random() * lines.length);
    return lines[i].childNodes[0].nodeValue;
  }

  return { init, getPrompt };
})(this, document);


/******************************************************************************
 * Metrics
 */

var gTimer = (function(window, document, undefined) {
  var typos = 0;
  var startDate = null;
  var testString = '';
  var ui = {
    accuracy: null,
    speed: null
  };

  function init() {
    for (var id in ui) {
      ui[id] = document.getElementById(id);
    }
  }

  function start(text) {
    startDate = new Date();
    testString = text;
    typos = 0;
  }

  function stop() {
    if (!testString) {
      ui.speed.innerHTML = '';
      ui.accuracy.innerHTML = '';
      return;
    }
    var elapsed = (new Date() - startDate) / 1000;
    if (elapsed < 1)
      return;
    ui.speed.innerHTML = Math.round(testString.length * 60 / elapsed);
    ui.accuracy.innerHTML = typos;
  }

  function typo() {
    typos++;
  }

  return { init, start, stop, typo };
})(this, document);


/******************************************************************************
 * Main
 */

var gTypist = (function(window, document, undefined) {
  var usrInputTimeout = 150;
  var text = '';
  var hints = [];
  var ui = {
    txtPrompt: null,
    txtInput: null
  };

  function init() {
    for (var id in ui) {
      ui[id] = document.getElementById(id);
    }

    ui.txtPrompt.value = '';
    ui.txtInput.value = '';
    ui.txtInput.focus();

    // highlight keyboard keys and emulate the keyboard layout
    let previousValue = '';
    ui.txtInput.onkeyup = event => gKeyboard.keyUp(event.code);
    ui.txtInput.onkeydown = event => {
      const value = gKeyboard.keyDown(event.code);
      if (previousValue !== ui.txtInput.value) {
        // working around a weird bug with dead keys on Firefox + Linux
        ui.txtInput.value = previousValue;
      }
      ui.txtInput.value += value;
      onInput(ui.txtInput.value);
      previousValue = ui.txtInput.value;
      return false;
    };

    window.addEventListener('lessonchange', newPrompt);
    window.addEventListener('layoutchange', newPrompt);
  }

  // display a new exercise and start the test
  function newPrompt() {
    text = gLessons.getPrompt();
    if (!text) {
      return;
    }

    gTimer.stop();
    gTimer.start(text);

    ui.txtPrompt.value = text;
    ui.txtInput.value = '';
    ui.txtInput.focus();

    gKeyboard.highlightKey(text.substring(0, 1));
  }

  function onInput(value) {
    if (!value.length) { // empty input box => reset timer
      gTimer.start(text);
      gKeyboard.highlightKey(text.substr(0, 1));
      return;
    }

    var pos = value.length - 1;
    if (pos == 0) { // first char => start the timer
      gTimer.start(text);
    }

    // Check if the last char is correct
    var entered = value.substring(pos);
    var expected = text.substr(pos, 1);
    if (entered != expected) { // mistake
      gTimer.typo();
    }

    // Check if the whole input is correct
    var correct = (value == text.substr(0, pos + 1));
    if (correct) {
      // highlight the next key (or remove highlighting if it's finished)
      gKeyboard.highlightKey(text.substr(pos + 1, 1));
      if (pos >= text.length - 1) { // finished
        newPrompt();
      }
    } else {
      // auto-correction
      ui.txtInput.className = 'error';
      setTimeout(function() {
        ui.txtInput.className = '';
      }, usrInputTimeout);
      ui.txtInput.value = ui.txtInput.value.substr(0, pos);
    }
  }

  return { init, newPrompt, onInput };
})(this, document);


/******************************************************************************
 * Startup
 */

window.addEventListener('DOMContentLoaded', () => {
  gLessons.init();
  gKeyboard.init();
  gTimer.init();
  gTypist.init();
});

window.addEventListener('hashchange', () => {
  var kbLayout = window.location.hash.substr(1);
  if (kbLayout !== gKeyboard.layout) {
    gKeyboard.layout = kbLayout;
  }
});
