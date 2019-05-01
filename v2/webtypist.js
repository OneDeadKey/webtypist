/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Web Typist
 * online touch-typing tutor
 */

const layoutsBase = 'https://fabi1cazenave.github.io/x-keyboard/layouts/';


/******************************************************************************
 * Keyboard Display
 */

const gKeyboard = (function(window, document, undefined) {
  let layoutList = {};
  let layoutId = '';
  let keyPressStyle = '';
  let ui = {
    layout: null,
    keyboard: null,
    shape: null,
    hints: null,
    hands: null
  };

  function init(layouts) {
    layoutList = layouts;
    for (let id in ui) {
      ui[id] = document.getElementById(id);
    }
    ui.keyboard = document.querySelector('x-keyboard');

    // fill layout selector
    let innerHTML = '';
    Object.entries(layouts)
      .sort(([ id1, name1 ], [ id2, name2 ]) => name1.localeCompare(name2))
      .forEach(([ key, name ]) => innerHTML += `
        <option value="${key}">${name}</option>`);
    ui.layout.innerHTML = innerHTML;

    ui.layout.addEventListener('change', (e) => setLayout(e.target.value));
    ui.shape.addEventListener('change', (e) => setShape(e.target.value));
    ui.hints.addEventListener('change', () => showHints(ui.hints.checked));
  }

  function setShape(value) {
    localStorage.setItem('kbShape', value);
    ui.keyboard.geometry = value;
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
    layoutId = kbLayout;
    ui.layout.value = kbLayout;
    gLessons.setLayout(kbLayout);
    return fetch(`${layoutsBase}/${kbLayout}.json`)
      .then(response => response.json())
      .then(data => {
        ui.keyboard.setKalamineLayout(data.layout, data.dead_keys,
          data.geometry.replace('ERGO', 'ISO'));
        localStorage.setItem('kbLayout', kbLayout);
        window.location.hash = kbLayout;
        showHints(localStorage.getItem('kbHints') != 'off');
        setShape(localStorage.getItem('kbShape'));
      });
  }

  function highlightKey(keyChar) {
    const keys = ui.keyboard.layout.getKeySequence(keyChar);
    const key = keys[ui.keyboard.layout.pendingDK ? 1 : 0];
    ui.hands.className = ui.keyboard.showHint(key);
  }

  return {
    init,
    setLayout,
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

const gLessons = (function(window, document, undefined) {
  let lessonsList = {};
  let lessonsDoc = null;
  let currentLevel = -1;
  let ui = {
    lesson: null,
    level: null,
    output: null
  };

  function init(courses) {
    lessonsList = courses;
    for (let id in ui) {
      ui[id] = document.getElementById(id);
    }

    // fill lesson selector (hidden options)
    let innerHTML = '';
    Object.entries(courses)
      .sort(([ id1, data1 ], [ id2, data2 ]) =>
        data1.title.localeCompare(data2.title))
      .forEach(([ key, data ]) => innerHTML += `
        <option hidden value="${key}">${data.title}</option>`);
    ui.lesson.innerHTML = innerHTML;

    // activate the lesson selector and select the user lesson
    ui.lesson.addEventListener('change', (e) => setLesson(e.target.value));
    ui.level.addEventListener('change', (e) => setLevel(e.target.value));
    setLesson(localStorage.getItem('lessonName') || 'english',
              localStorage.getItem('lessonLevel'));
  }

  function setLayout(layoutName) {
    const suitable = Object.entries(lessonsList)
      .filter(([ id, data ]) => data.layouts.indexOf(layoutName) >= 0)
      .map(([ id, data ]) => id);
    const options = Array.from(ui.lesson.children);
    options.forEach(opt => opt.hidden = (suitable.indexOf(opt.value) < 0));
    ui.lesson.hidden = (options.filter(opt => !opt.hidden).length <= 1);
    if (suitable.indexOf(ui.lesson.value) < 0) {
      setLesson(suitable[0], 0);
    }
  }

  function setLesson(lessonName, levelIndex) {
    ui.level.innerHTML = '<option> (loading\u2026) </option>';
    fetch(`./lessons/${lessonName}.xml`)
      .then(response => response.text())
      .then(str => (new DOMParser()).parseFromString(str, 'text/xml'))
      .then(xmldoc => {
        lessonsDoc = xmldoc;

        // fill the lesson selector
        let i = 0, innerHTML = '';
        Array.from(xmldoc.getElementsByTagName('lesson')).forEach(node => {
          const name = node.getElementsByTagName('title')
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
    gTypist.newPrompt();
  }

  function getPrompt() {
    const index = ui.level.selectedIndex;
    if (index < 0) {
      return;
    }
    // select a random line in the current level
    const trim = /^\s+|\s+$/g;
    const text = lessonsDoc.getElementsByTagName('lesson').item(index)
      .getElementsByTagName('text').item(0).childNodes[0].nodeValue;
    const lines = text.replace(trim, '').split('\n');
    const i = Math.floor(Math.random() * lines.length);
    return lines[i].replace(trim, '');
  }

  return { init, getPrompt, setLayout };
})(this, document);


/******************************************************************************
 * Metrics
 */

const gTimer = (function(window, document, undefined) {
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

const gTypist = (function(window, document, undefined) {
  var usrInputTimeout = 150;
  var text = '';
  var hints = [];
  var ui = {
    txtPrompt: null,
    txtInput: null
  };

  function init() {
    for (let id in ui) {
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

window.addEventListener('hashchange', () => {
  let kbLayout = window.location.hash.substr(1);
  if (kbLayout !== gKeyboard.layout) {
    gKeyboard.layout = kbLayout;
  }
});

window.addEventListener('DOMContentLoaded', () => {
  fetch(`./lessons.json`)
    .then(response => response.json())
    .then(data => {
      gLessons.init(data.courses);
      gKeyboard.init(data.layouts);
      // apply keyboard layout -- from URL hash, or from localStorage
      const kbLayout = window.location.hash.substring(1) ||
        localStorage.getItem('kbLayout') || 'us';
      gKeyboard.setLayout(kbLayout).then(() => {
        gTimer.init();
        gTypist.init();
      });
    });
});
