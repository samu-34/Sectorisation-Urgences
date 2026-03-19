const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class FakeNode {}

class FakeTextNode extends FakeNode {
  constructor(text) {
    super();
    this.nodeType = 3;
    this.text = String(text);
    this.parentElement = null;
  }

  get textContent() {
    return this.text;
  }

  set textContent(value) {
    this.text = String(value);
  }
}

class FakeDocumentFragment extends FakeNode {
  constructor(ownerDocument) {
    super();
    this.ownerDocument = ownerDocument;
    this.children = [];
  }

  appendChild(child) {
    child.parentElement = null;
    this.children.push(child);
    return child;
  }

  append(...parts) {
    parts.forEach((part) => {
      if (part instanceof FakeNode) {
        this.appendChild(part);
      } else {
        this.appendChild(this.ownerDocument.createTextNode(String(part)));
      }
    });
  }

  get textContent() {
    return this.children.map((child) => child.textContent).join("");
  }
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.tokens = new Set();
  }

  add(...tokens) {
    tokens.forEach((token) => this.tokens.add(token));
    this._sync();
  }

  remove(...tokens) {
    tokens.forEach((token) => this.tokens.delete(token));
    this._sync();
  }

  contains(token) {
    return this.tokens.has(token);
  }

  toggle(token, force) {
    if (force === true) {
      this.tokens.add(token);
    } else if (force === false) {
      this.tokens.delete(token);
    } else if (this.tokens.has(token)) {
      this.tokens.delete(token);
    } else {
      this.tokens.add(token);
    }
    this._sync();
  }

  setFromString(value) {
    this.tokens = new Set(String(value || "").split(/\s+/).filter(Boolean));
    this._sync();
  }

  _sync() {
    this.owner._className = [...this.tokens].join(" ");
  }
}

class FakeElement extends FakeNode {
  constructor(tagName = "div", ownerDocument = null) {
    super();
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
    this._className = "";
    this.classList = new FakeClassList(this);
    this.id = "";
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get className() {
    return this._className;
  }

  set textContent(value) {
    this.children = [];
    this._innerHTML = "";
    this._textContent = String(value);
  }

  get textContent() {
    if (this.children.length) {
      return this.children.map((child) => child.textContent).join("");
    }
    return this._textContent;
  }

  set innerHTML(value) {
    this.children = [];
    this._textContent = "";
    this._innerHTML = String(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    if (!(child instanceof FakeNode)) {
      throw new Error("appendChild expects a FakeNode");
    }
    if (child instanceof FakeDocumentFragment) {
      child.children.forEach((fragmentChild) => this.appendChild(fragmentChild));
      return child;
    }
    child.parentElement = this;
    this.children.push(child);
    this._textContent = "";
    this._innerHTML = "";
    return child;
  }

  append(...parts) {
    parts.forEach((part) => {
      if (part instanceof FakeNode) {
        this.appendChild(part);
      } else {
        this.appendChild(this.ownerDocument.createTextNode(String(part)));
      }
    });
  }

  replaceChildren(...parts) {
    this.children = [];
    this._textContent = "";
    this._innerHTML = "";
    parts.forEach((part) => {
      if (part instanceof FakeNode) {
        this.appendChild(part);
      } else {
        this.appendChild(this.ownerDocument.createTextNode(String(part)));
      }
    });
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  dispatchEvent(event) {
    const evt = typeof event === "string" ? { type: event } : event;
    evt.target = evt.target || this;
    evt.preventDefault = evt.preventDefault || (() => {});
    const list = this.listeners.get(evt.type) || [];
    list.forEach((listener) => listener(evt));
  }

  querySelectorAll(selector) {
    const matches = [];
    if (!selector.startsWith(".")) return matches;
    const className = selector.slice(1);

    const visit = (node) => {
      if (!(node instanceof FakeElement)) return;
      if (node.classList.contains(className)) {
        matches.push(node);
      }
      node.children.forEach(visit);
    };

    this.children.forEach(visit);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  contains(target) {
    if (target === this) return true;
    return this.children.some((child) => child instanceof FakeElement && child.contains(target));
  }
}

class FakeDocument {
  constructor() {
    this.listeners = new Map();
    this.elements = new Map();
    this.body = new FakeElement("body", this);
    this.documentElement = new FakeElement("html", this);
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text) {
    return new FakeTextNode(text);
  }

  createDocumentFragment() {
    return new FakeDocumentFragment(this);
  }

  getElementById(id) {
    if (!this.elements.has(id)) {
      const element = new FakeElement("div", this);
      element.id = id;
      this.elements.set(id, element);
      this.body.appendChild(element);
    }
    return this.elements.get(id);
  }

  querySelector(selector) {
    if (selector === ".panel") {
      return this.getElementById("panel-root");
    }
    return null;
  }

  querySelectorAll() {
    return [];
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  dispatchEvent(event) {
    const evt = typeof event === "string" ? { type: event } : event;
    const list = this.listeners.get(evt.type) || [];
    list.forEach((listener) => listener(evt));
  }
}

function createLeafletStub() {
  function makeLayer(type, payload = {}) {
    return {
      type,
      payload,
      addTo(map) {
        this.map = map;
        map._layers.push(this);
        return this;
      },
      bindPopup(content, options) {
        this.popupContent = content;
        this.popupOptions = options;
        return this;
      }
    };
  }

  return {
    map() {
      return {
        _layers: [],
        _listeners: new Map(),
        _zoom: 10,
        setView() {
          return this;
        },
        getZoom() {
          return this._zoom;
        },
        removeLayer(layer) {
          this._layers = this._layers.filter((item) => item !== layer);
        },
        fitBounds(bounds, options) {
          this._lastBounds = bounds;
          this._lastFitOptions = options;
        },
        on(type, listener) {
          this._listeners.set(type, listener);
        },
        invalidateSize() {}
      };
    },
    tileLayer() {
      return makeLayer("tileLayer");
    },
    circle(coords, options) {
      return makeLayer("circle", { coords, options });
    },
    circleMarker(coords, options) {
      return makeLayer("circleMarker", { coords, options });
    },
    polyline(coords, options) {
      return makeLayer("polyline", { coords, options });
    },
    marker(coords, options) {
      return makeLayer("marker", { coords, options });
    },
    divIcon(options) {
      return options;
    },
    latLngBounds(a, b) {
      return {
        points: [a, b],
        extend(point) {
          this.points.push(point);
        }
      };
    }
  };
}

function createAppHarness() {
  const document = new FakeDocument();
  const windowListeners = new Map();
  const windowObject = {
    addEventListener(type, listener) {
      const list = windowListeners.get(type) || [];
      list.push(listener);
      windowListeners.set(type, list);
    },
    dispatchEvent(event) {
      const evt = typeof event === "string" ? { type: event } : event;
      const list = windowListeners.get(evt.type) || [];
      list.forEach((listener) => listener(evt));
    },
    setTimeout(fn) {
      fn();
      return 0;
    },
    clearTimeout() {}
  };

  const context = vm.createContext({
    console,
    document,
    window: windowObject,
    globalThis: null,
    Node: FakeNode,
    L: createLeafletStub(),
    setTimeout: windowObject.setTimeout,
    clearTimeout: windowObject.clearTimeout
  });
  context.globalThis = context;

  const dataSource = fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8");
  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  vm.runInContext(dataSource, context, { filename: "data.js" });
  vm.runInContext(
    `${appSource}
globalThis.__APP_EXPORTS__ = {
  DOM,
  syncSelectionFromCityInput,
  updateDecision,
  getCurrentArea,
  resetDecisionState,
  renderToolbar,
  buildDecisionCard,
  getInternalState: () => ({ activeSpecialty, routeLayer, focusLayer })
};`,
    context,
    { filename: "app.js" }
  );

  document.dispatchEvent({ type: "DOMContentLoaded" });

  return {
    document,
    window: windowObject,
    exports: context.__APP_EXPORTS__
  };
}

module.exports = { createAppHarness };
