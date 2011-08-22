
/*****************************************************************************\
|                                                                             |
|  Web Typist                                                                 |
|  a free, web-based, simple touch-typing tutor                               |
|                                                                             |
\*****************************************************************************/

function removeAllChildren(node) {
  // node.innerHTML = ""; // XXX dirty and not working with XHTML
  while (node.childNodes.length)
    node.removeChild(node.firstChild);
}


// ===========================================================================
// Browser Abstraction Layer (events, XMLHttpRequest)
// ===========================================================================

var EVENTS = {
  addListener    : function(node, type, callback) {},
  preventDefault : function(event) {},
  onDOMReady     : function(callback) {}
};
if (window.addEventListener) { // modern browsers
  EVENTS.addListener = function(node, type, callback) {
    node.addEventListener(type, callback, false);
  };
  EVENTS.preventDefault = function(event) {
    event.preventDefault();
  };
  EVENTS.onDOMReady = function(callback) {
    window.addEventListener("DOMContentLoaded", callback, false);
  };
}
else if (window.attachEvent) { // Internet Explorer 6/7/8
  EVENTS.addListener = function(node, type, callback) {
    // http://www.quirksmode.org/blog/archives/2005/10/_and_the_winner_1.html
    var ref = type + callback;
    node["e"+ref] = callback;
    node[ref] = function() { node["e"+ref](window.event); };
    node.attachEvent("on" + type, node[ref]);
  };
  EVENTS.preventDefault = function(event) {
    event.returnValue = false;
  };
  EVENTS.onDOMReady = function(callback) {
    window.attachEvent("onload", callback);
  };
}

function xhrLoadXML(href, callback) {
  /* works with Firefox but not with Safari
  if (document.implementation && document.implementation.createDocument) {
    var xmldoc = document.implementation.createDocument("", "", null);
    xmldoc.onload = function() { callback(xmldoc); };
    xmldoc.load(href);
  } */

  // IE6 doesn't support XMLHttpRequest natively
  // IE6/7/8 don't support overrideMimeType with native XMLHttpRequest
  // IE6/7/8/9 don't allow loading any local file with native XMLHttpRequest
  // so we use ActiveX for XHR on IE, period.
  if (window.ActiveXObject) {
    var xhr = new ActiveXObject("Microsoft.XMLHTTP");
    xhr.open("GET", href, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var xmldoc = new ActiveXObject("Microsoft.XMLDOM");
        xmldoc.loadXML(xhr.responseText);
        callback(xmldoc);
      }
    };
    xhr.send(null);
  }
  // note that Chrome won't allow loading any local document with XHR
  else if (window.XMLHttpRequest) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", href, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4)
        callback(xhr.responseXML);
    };
    xhr.send(null);
  }
}


// ===========================================================================
// Cookie Management
// ===========================================================================

function getCookie(name) {
  var results = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
  if (results)
    return (unescape(results[2]));
  else
    return null;
}
function setCookie(name, value, expiredays) {
  var cookie = name + "=" + escape(value);
  if (expiredays != null) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + expiredays);
    cookie += ";expires=" + exdate.toUTCString();
  }
  document.cookie = cookie;
}


// ===========================================================================
// Keyboard Display
// ===========================================================================

var gKeyboard = {
  xmldoc : null,        // xml layout document
  keymap : new Array(), // [ (charString, keyRef) ]
  keymod : new Array(), // [ (charString, modifierRef) ]
  activeKey : null,
  activeMod : null,
  usrInputTimeout : 150,
  usrInputStyle : "color: white; background-color: black;"
  //usrInputStyle : "color: white; background-color: black; opacity: 1; filter: opacity(100);"
};

function setShape(value) {
  if (value == "pc105") {
    document.getElementById("_ae01").className = "left5"; 
    document.getElementById("_ae02").className = "left5"; 
    document.getElementById("_ae03").className = "left4"; 
    document.getElementById("_ae04").className = "left3"; 
    document.getElementById("_ae05").className = "left2"; 
    document.getElementById("_ae06").className = "left2"; 
    document.getElementById("_ae07").className = "right2"; 
    document.getElementById("_ae08").className = "right2"; 
    document.getElementById("_ae09").className = "right3"; 
    document.getElementById("_ae10").className = "right4"; 
  } else {
    document.getElementById("_ae01").className = "left5"; 
    document.getElementById("_ae02").className = "left4"; 
    document.getElementById("_ae03").className = "left3"; 
    document.getElementById("_ae04").className = "left2"; 
    document.getElementById("_ae05").className = "left2"; 
    document.getElementById("_ae06").className = "right2"; 
    document.getElementById("_ae07").className = "right2"; 
    document.getElementById("_ae08").className = "right3"; 
    document.getElementById("_ae09").className = "right4"; 
    document.getElementById("_ae10").className = "right5"; 
  }
  setCookie("shape", value);
  document.body.className = value;
  document.getElementById("shape").value = value;
}

function showHints(on) {
  document.getElementById("keyboard").className = on ? "hints" : "";
  document.getElementById("hints").checked = on;
  setCookie("hints", (on ? "on" : "off"));
}

function setLayout(href, variantID) {
  // clear the variant selector
  gKeyboard.variant.innerHTML = "<option> (loading...) </option>"; // XXX

  // load the layout file
  xhrLoadXML(href, function(xmldoc) {
    gKeyboard.xmldoc = xmldoc;
    var variants = xmldoc.getElementsByTagName("variant");

    // fill the layout selector drop-down menu if needed
    removeAllChildren(gKeyboard.variant);
    for (var i = 0; i < variants.length; i++) {
      var id   = variants[i].getAttribute("id");
      var name = variants[i].getAttribute("name") || "--";
      var option = document.createElement("option");
      var value  = document.createTextNode(name);
      option.appendChild(value);
      option.setAttribute("value", id);
      if (!id)
        option.disabled = true;
      gKeyboard.variant.appendChild(option);
    }

    // select the layout, if any
    if (!variantID)
      variantID = variants[0].getAttribute("id");
    setVariant(variantID);
  });

  // update the form selector
  setCookie("layout", href);
  document.getElementById("layout").value = href;
}

function setVariant(variantID) {
  //var variant = gKeyboard.xmldoc.getElementById(variantID);
  // getElementById doesn't work on these XML files and I can't see why *sigh*
  // So this here's a dirty getElementById:
  var variant = null;
  var tmp = gKeyboard.xmldoc.getElementsByTagName("variant");
  for (var i = 0; i < tmp.length; i++) {
    if (tmp[i].getAttribute("id") == variantID) {
      variant = tmp[i];
      break;
    }
  }
  if (!variant) return;

  // load the base layout the selected variant relies on, if any
  //if (variant.hasAttribute("include")) // not supported by IE
  var include = variant.getAttribute("include");
  if (include) setVariant(include);

  // update the selector
  setCookie("variantID", variantID);
  document.getElementById("variant").value = variantID;

  // fill the graphical keyboard
  var keys = variant.getElementsByTagName("key");
  for (var i = 0; i < keys.length; i++)
    drawKey(keys[i]);
}

function drawKey(xmlElement) {
  var name  = "_" + xmlElement.getAttribute("name").toLowerCase();
  var base  = xmlElement.getAttribute("base");
  var shift = xmlElement.getAttribute("shift");
  var element = document.getElementById(name);
  if (!element) return;

  // fill <li> element
  removeAllChildren(element);
  // create <strong> for 'shift'
  var strong = document.createElement("strong");
  var strongStr = document.createTextNode(shift);
  strong.appendChild(strongStr);
  element.appendChild(strong);
  // append <em> for 'base' if necessary (not a letter)
  if (shift.toLowerCase() != base) {
    var em = document.createElement("em");
    var emStr = document.createTextNode(base);
    em.appendChild(emStr);
    element.appendChild(em);
  }

  // store current key in the main hash table
  gKeyboard.keymap[base]  = element;
  gKeyboard.keymap[shift] = element;
}

function keyPress(event) {
  // find which key has been pressed
  var keyChar = null;
  if (event.which == null)
    keyChar = String.fromCharCode(event.keyCode);  // IE
  else if (event.which != 0 && event.charCode != 0)
    keyChar = String.fromCharCode(event.which);    // modern browsers
  else if (event.keyCode >= 32 && event.keyCode < 127)
    keyChar = String.fromCharCode(event.keyCode);
 
  // highlight the key that has been pressed
  var key = gKeyboard.keymap[keyChar];
  if (key) {
    key.style.cssText = gKeyboard.usrInputStyle;
    setTimeout(function() {
      key.style.cssText = "";
    }, gKeyboard.usrInputTimeout);
  }

  // textInput() is triggered by 'onkeyup' instead
  //textInput(gKeyboard.txtInput.value);
}

function keyDown(event) {
  // disable special keys in the text input box
  switch (event.keyCode) {
    case 8:  // BackSpace
    case 9:  // Tab
    case 46: // Delete
    case 27: // Escape
      EVENTS.preventDefault(event);
      return;
  }
}

function highlightKey(keyChar) {
  // remove last key's highlighting
  if (gKeyboard.activeKey) {
    var className = gKeyboard.activeKey.className.replace(/\s.*$/, "");
    gKeyboard.activeKey.className = className;
  }
  if (gKeyboard.activeMod)
    gKeyboard.activeMod.className = "specialKey";

  // highlight the new key
  var key = gKeyboard.keymap[keyChar];
  if (key) {
    gKeyboard.activeKey = key;
    key.className += " active";
    // TODO: highlight the modifier, too
  }
}

function textInput(value) {
  if (!value.length) { // empty input box => reset timer
    //gTimer.stop();
    highlightKey(gLessons.txtPrompt.value.substr(0,1));
    return;
  }

  var pos = value.length-1;
  if (pos == 0) { // first char => start the timer
    //gTimer.start();
  }

  // Check if the last char is correct
  var entered = value.substring(pos);
  var expected = gLessons.txtPrompt.value.substr(pos, 1);
  if (entered != expected) { // mistake
    //gTimer.typo();
  }

  // Check if the whole input is correct
  var correct = (value == gLessons.txtPrompt.value.substr(0, pos+1));
  //gKeyboard.txtInput.setAttribute("class", correct ? "" :  "error");
  if (correct) {
    // highlight the next key (or remove highlighting if it's finished)
    highlightKey(gLessons.txtPrompt.value.substr(pos+1, 1));
    // finished?
    if (pos >= gLessons.txtPrompt.value.length-1) {
      nextPrompt();
    }
  }
  else {
    // TODO: highlight the backspace key
    //highlightSpecialKey(gKeyboard.bspaceKey);
    // alternative: auto-correction
    gKeyboard.txtInput.className = "error";
    setTimeout(function() {
      gKeyboard.txtInput.className = "";
    }, gKeyboard.usrInputTimeout);
    gKeyboard.txtInput.value = gKeyboard.txtInput.value.substr(0, pos);
  }
}


// ===========================================================================
// Typing Lessons (aka KTouchLecture)
// ===========================================================================

var gLessons = {
  xmldoc: null,        // xml lesson document
  levelSelector: null,
  txtPrompt: null,
  currentLevel: -1
}

function setLesson(href, levelIndex) {
  // clear the level selector
  gLessons.levelSelector.innerHTML = "<option> (loading...) </option>"; // XXX

  // load the layout file
  xhrLoadXML(href, function(xmldoc) {
    gLessons.xmldoc = xmldoc;
    var levelNodes = xmldoc.getElementsByTagName("Level");

    // fill the lesson selector
    removeAllChildren(gLessons.levelSelector);
    for (var i = 0; i < levelNodes.length; i++) {
      var name = levelNodes[i].getElementsByTagName("NewCharacters")
                              .item(0).childNodes[0].nodeValue;
      var option = document.createElement("option");
      var text   = document.createTextNode((i+1) + ": " + name);
      option.appendChild(text);
      option.setAttribute("value", i);
      gLessons.levelSelector.appendChild(option);
    }

    // select the difficulty level
    setLevel(levelIndex);
  });

  // update the form selector
  setCookie("lesson", href);
  document.getElementById("lesson").value = href;
}

function setLevel(levelIndex) {
  document.getElementById("level").value = levelIndex;
  setCookie("level", levelIndex);
  newPromptFromLessons();
}

function newPrompt(value) {
  // display a new exercise and start the test
  highlightKey(value.substring(0,1));
  gLessons.txtPrompt.value = value;
  gKeyboard.txtInput.value = "";
  gKeyboard.txtInput.focus(); // XXX not working on Safari
  /* setTimeout(function() {
    gKeyboard.txtInput.focus();
  }, 100); */
}

function newPromptFromLessons() {
  // select a random line in the current level
  var index = gLessons.levelSelector.selectedIndex;
  if (index < 0) return;
  var lines = gLessons.xmldoc.getElementsByTagName("Level").item(index)
                             .getElementsByTagName("Line");
  var i = Math.floor(Math.random() * lines.length);
  newPrompt(lines[i].childNodes[0].nodeValue);
}

function nextPrompt() {
  return newPromptFromLessons();
  // TODO
  gTimer.stop();
  var nextLevel = gTimer.report();

  if (gDialog.mode == modLESSONS) {
    if (nextLevel) { // get to the next level
      alert("Congrats!\nLet's get to the next level.");
      gTimer.reset();
      gDialog.level.selectedIndex++;
    }
    newPromptFromLessons();
  }
  else if (gDialog.mode == modPANGRAMS) {
    newPromptFromPangrams();
  }
  else if (gDialog.mode == modCLIPBOARD) {
  }
}


// ===========================================================================
// Metrics
// ===========================================================================

var gMetrics = {};


// ===========================================================================
// Startup
// ===========================================================================

EVENTS.onDOMReady(function() {
  // set the keyboard layout
  gKeyboard.variant  = document.getElementById("variant");
  gKeyboard.txtInput = document.getElementById("txtInput");
  gKeyboard.keymap  = new Array();
  var layout = getCookie("layout") || "layouts/qwerty.xml";
  setLayout(layout, getCookie("variantID"));
  setShape(getCookie("shape"));
  showHints(getCookie("hints") == "on");

  // bind event listeners to the text input:
  //  'keypress' : tracks normal keys (characters)
  //  'keydown'  : tracks special keys (tab, escape, backspace...)
  //  'keyup'    : tracks inputs in the <textarea> node:
  //     the 'input' event would work much better (less latency)
  //     but it isn't supported by IE<9 and Safari 4
  EVENTS.addListener(gKeyboard.txtInput, "keypress", keyPress);
  EVENTS.addListener(gKeyboard.txtInput, "keydown",  keyDown);
  EVENTS.addListener(gKeyboard.txtInput, "keyup", function() {
    textInput(this.value);
  });

  // set the typing lesson
  gLessons.levelSelector = document.getElementById("level");
  gLessons.txtPrompt     = document.getElementById("txtPrompt");
  gLessons.txtPrompt.value = "";
  var lesson = getCookie("lesson") || "lessons/english.ktouch.xml";
  setLesson(lesson, getCookie("level"));

  // go, go, go!
  gKeyboard.txtInput.focus();
});

// ===========================================================================
// Ad-Blocker test
// ===========================================================================

if (window.addEventListener) window.addEventListener("load", function() {
  // Check that all keys are properly displayed
  // AdBlockPlus is likely to hide a few keys *sigh*
  var badRendering = document.getElementById("badRendering");
  if (!badRendering) return;

  var keys = [
    "_ae01", "_ae02", "_ae03", "_ae04", "_ae05", "_ae06", "_ae07", "_ae08", "_ae09", "_ae10", "_ae11", "_ae12",
    "_ad01", "_ad02", "_ad03", "_ad04", "_ad05", "_ad06", "_ad07", "_ad08", "_ad09", "_ad10", "_ad11", "_ad12",
    "_ac01", "_ac02", "_ac03", "_ac04", "_ac05", "_ac06", "_ac07", "_ac08", "_ac09", "_ac10", "_ac11",
    "_ab01", "_ab02", "_ab03", "_ab04", "_ab05", "_ab06", "_ab07", "_ab08", "_ab09", "_ab10",
  ];
  for (var i = 0; i < keys.length; i++) {
    var key = document.getElementById(keys[i]);
    if (parseInt(key.getBoundingClientRect().width, 10) < 40) {
      badRendering.style.display = "block";
      break;
    }
  }
}, false);

