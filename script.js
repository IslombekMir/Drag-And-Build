let pageState = [];
let elementCount = { p: 0, h1: 0, h2: 0, div: 0, span: 0, button: 0 };
let layoutCount = { row: 0, column: 0, center: 0 };
const layoutStyles = {
  row: {
    display: "flex",
    flexDirection: "row",
    gap: "1rem",
    flexWrap: "wrap",
    flex: "1"
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    flex: "1"
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flex: "1"
  }
};

let selectedID = null;
let currentElem = null;


//Return to canvas to add layout
document.getElementById("canvas").addEventListener("click", (e) => {
    if(e.target === canvas) {
      currentElem = null;
      document.getElementById("currentWorkspace").textContent = "Page";
    }
})

/* --- Utilities --- */
function findElementById(tree, id) {
  for (let el of tree) {
    if (el.id === id) return el;
    if (el.children) {
      const found = findElementById(el.children, id);
      if (found) return found;
    }
  }
  return null;
}

/* --- Core --- */
function addElement(type) {
  elementCount[type]++;
  const id = `${type}_${elementCount[type]}`;

  const newEl = {
    id,
    type,
    textContent: type === "div" ? "" : type,
    styles: {},
    children: []
  };

  if (currentElem) {
    const parent = findElementById(pageState, currentElem);
    if (parent) parent.children.push(newEl);
    else pageState.push(newEl);
  } else {
    pageState.push(newEl);
  }

  renderCanvas();
  updateIDPanel();
}

function addLayout(type) {
  layoutCount[type]++;
  const id = `layout_${type}_${layoutCount[type]}`;
  const layoutEl = {
    id,
    type: "div",
    layout: type,
    textContent: "",
    styles: {
      ...layoutStyles[type],
      padding: "0.5rem",
      marginBottom: "0.5rem"
    },
    children: []
  };

  if (currentElem) {
    const parent = findElementById(pageState, currentElem);
    if (parent) parent.children.push(layoutEl);
    else pageState.push(layoutEl);
  } else {
    pageState.push(layoutEl);
  }

  renderCanvas();
  updateIDPanel();
}

function removeElementbyID(tree, id) {
    for(let i = 0; i < tree.length; i++) {
      const elem = tree[i];
      if(elem.id === id) {
        tree.splice(i, 1);
        return true;
      }

      if(elem.children && elem.children.length > 0) {
        const removed = removeElementbyID(elem.children, id);
        if(removed) return true;
      }
    }
    return false;
}

function removeElement() {
  if(!selectedID) return;
  removeElementbyID(pageState, selectedID);
  renderCanvas();
  updateIDPanel();
}




function renderCanvas() {
  const canvas = document.getElementById("canvas");
  canvas.innerHTML = "";

  pageState.forEach(el => canvas.appendChild(renderElement(el)));
}

function renderElement(el) {
    const domEl = document.createElement(el.type);
    domEl.id = el.id;
    domEl.textContent = el.textContent;

    makeEditable(domEl, el.id);

    if (el.children && el.children.length > 0) {
        el.children.forEach(child => domEl.appendChild(renderElement(child)));
    }

    Object.assign(domEl.style, el.styles);

    if (el.layout) {
      domEl.style.border = "2px dashed #888";
    }


    return domEl;
}

function makeEditable(elem, id) {
  elem.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedID = id;

    const item = findElementById(pageState, id);

    if (item && item.type === "div") {
      currentElem = id;
      document.getElementById("currentWorkspace").textContent = currentElem;
    } else {
      elem.contentEditable = "true";
      elem.focus();

      elem.addEventListener("blur", () => {
        elem.contentEditable = "false";
        const item = findElementById(pageState, id);
        if (item) item.textContent = elem.textContent;
      }, { once: true });
    }
  });
}


function updateIDPanel() {
  const idList = document.getElementById("idList");
  idList.innerHTML = "";

  function addIDs(tree) {
    tree.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.id;

      li.addEventListener("click", () => {
        const target = document.getElementById(item.id);
        if (target) target.click();
      });

      idList.appendChild(li);

      if (item.children.length > 0) addIDs(item.children);
    });
  }

  addIDs(pageState);
}


function exportCode() {
  // build HTML with classes
    function buildHTML(tree, indent = "  ") {
      return tree.map(el => {
        const classAttr = el.layout ? ` class="layout-${el.layout}"` : "";
        const open = `${indent}<${el.type} id="${el.id}"${classAttr}>`;
        const close = `</${el.type}>\n`;

        if (el.children.length > 0) {
          return `${open}\n${buildHTML(el.children, indent + "  ")}${indent}${close}`;
        } else {
          return `${open}${el.textContent}${close}`;
        }
      }).join("");
    }

    const html =
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exported Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
${buildHTML(pageState)}
</body>
</html>`;

  // build CSS rules for layouts
  const cssRules = {
    row: {
      display: "flex",
      flexDirection: "row",
      gap: "1rem",
      flexWrap: "wrap",
      flex: "1",
      padding: "0.5rem",
      marginBottom: "0.5rem"
    },
    column: {
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      flex: "1",
      padding: "0.5rem",
      marginBottom: "0.5rem"
    },
    center: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flex: "1",
      padding: "0.5rem",
      marginBottom: "0.5rem"
    }
  };

  let css = "";
  for (const [layout, styles] of Object.entries(cssRules)) {
    css += `.layout-${layout} {\n`;
    for (const [prop, value] of Object.entries(styles)) {
      // convert camelCase → kebab-case
      const cssProp = prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
      css += `  ${cssProp}: ${value};\n`;
    }
    css += `}\n\n`;
  }

  // open window and show both
  const win = window.open("", "_blank");
  win.document.write(
    `<h2>index.html</h2><pre>${html.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>` +
    `<h2>styles.css</h2><pre>${css}</pre>`
  );
  win.document.close();
}


document.getElementById("exportBtn").addEventListener("click", exportCode);
