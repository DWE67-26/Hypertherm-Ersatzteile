import {
  initDB,
  loadAppData,
  saveAppData,
  exportToJsonFile,
} from "./database.js";
import { checkAndGenerateOrder } from "./order.js";

let appComponents = [];
let appCategories = [];
let currentMachine = "FICEP Gemini";
let db; // Stellt sicher, dass die Datenbank-Variable global im Modul bekannt ist

// App-Start initialisieren
async function initApp() {
  try {
    db = await initDB(); // Speichert die DB-Referenz in der globalen Variable
    const data = await loadAppData();
    appCategories = data.categories || [
      "Bohrkörper (Modular Drill Bodies)",
      "Bohrspitzen (Carbide Tips)",
    ];
    appComponents = data.components || [];

    setupEventListeners();
    renderAll();
  } catch (err) {
    console.error("Fehler beim Starten der App:", err);
  }
}

function saveState() {
  saveAppData(appCategories, appComponents);
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderAdmin();
}

// Event Listener binden
function setupEventListeners() {
  document
    .getElementById("dash-machine-select")
    .addEventListener("change", (e) => {
      currentMachine = e.target.value;
      document.getElementById("dashboard-title").textContent =
        `Bestand: ${currentMachine}`;
      renderDashboard();
    });
  // NEU: Listener für den Obergruppen-Filter auf dem Dashboard
  document
    .getElementById("dash-category-filter")
    .addEventListener("change", () => {
      renderDashboard(); // Aktualisiert die Tabelle sofort nach Auswahl
    });
  document
    .getElementById("btn-export-json")
    .addEventListener("click", () =>
      exportToJsonFile(appCategories, appComponents),
    );

  // Trigger für das versteckte Datei-Feld
  document
    .getElementById("btn-import-trigger")
    .addEventListener("click", () => {
      document.getElementById("json-file-input").click();
    });

  // KORREKTUR: Der Change-Listener wird jetzt direkt hier bombensicher an das Element gebunden!
  document.getElementById("json-file-input").addEventListener("change", (e) => {
    importFromJson(e);
  });

  document
    .getElementById("category-form")
    .addEventListener("submit", handleCategorySubmit);
  document
    .getElementById("component-form")
    .addEventListener("submit", handleComponentSubmit);
  document
    .getElementById("btn-cancel-edit")
    .addEventListener("click", resetForm);
  document
    .getElementById("btn-copy")
    .addEventListener("click", copyToClipboard);
  document.getElementById("btn-email").addEventListener("click", sendEmail);
  document
    .getElementById("btn-reset-data")
    .addEventListener("click", triggerReset);
  document.getElementById("btn-email").addEventListener("click", sendEmail);
  // Navigations-Tabs
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".view-section")
        .forEach((s) => s.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.view).classList.add("active");
      const hs = document.getElementById("dash-machine-wrap");
      if (btn.dataset.view === "admin") {
        hs.style.opacity = "0.3";
        hs.style.pointerEvents = "none";
      } else {
        hs.style.opacity = "1";
        hs.style.pointerEvents = "auto";
      }
    });
  });
}
function renderDashboard() {
  const tbody = document.getElementById("dashboard-table-body");
  const filterElement = document.getElementById("dash-category-filter");

  if (!tbody || !filterElement) return;

  const filter = filterElement.value;
  tbody.innerHTML = "";

  // Dropdown-Optionen dynamisch neu generieren, ohne die aktuelle Auswahl zu verlieren
  const lastFilter = filter;
  filterElement.innerHTML =
    '<option value="ALL">Alle Obergruppen</option>' +
    appCategories.map((c) => `<option value="${c}">${c}</option>`).join("");
  filterElement.value = appCategories.includes(lastFilter) ? lastFilter : "ALL";

  // Filter-Logik anwenden: Nur "ALL" oder exakte Übereinstimmung der Obergruppe
  const filtered = appComponents.filter(
    (c) => filter === "ALL" || c.category === filter,
  );

  filtered.forEach((item) => {
    if (!item.stocks[currentMachine])
      item.stocks[currentMachine] = { actual: 0, target: 0 };
    const stock = item.stocks[currentMachine];
    const diff = stock.actual - stock.target;

    let badge = '<span class="badge badge-ok">Optimal</span>';
    if (diff < 0)
      badge =
        stock.actual === 0
          ? '<span class="badge badge-critical">Leer</span>'
          : '<span class="badge badge-low">Nachbestellen</span>';

    const tr = document.createElement("tr");
    const imgSrc = item.image
      ? `/assets/images/${item.image}`
      : 'data:image/svg+xml;utf8,<svg xmlns="http://w3.org" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

    // Passe diesen Abschnitt in der renderDashboard() Funktion deiner js/app.js an:
    // Suche diesen Block in der renderDashboard() in deiner js/app.js und ersetze ihn:
    tr.innerHTML = `
  <td>
    <img src="${imgSrc}" class="comp-img" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://w3.org\' width=\'50\' height=\'50\'><rect width=\'100%\' height=\'100%\' fill=\'%23cbd5e1\'/><text x=\'50%\' y=\'55%\' font-size=\'10\' text-anchor=\'middle\' fill=\'%23475569\'>Fehlt</text></svg>'">
    <strong>${item.catalog}</strong> <!-- ⚡ KORREKTUR: Bestellnummer sitzt jetzt MIT in der 1. Zelle neben dem Bild -->
  </td>
  <td>${item.name}</td> <!-- Bezeichnung rutscht auf Position 2 -->
  <td>
    <div class="stock-counter">
      <button class="btn-stock-adjust" data-id="${item.id}" data-amt="-1">−</button>
      <span class="stock-display-value">${stock.actual}</span>
      <button class="btn-stock-adjust" data-id="${item.id}" data-amt="1">+</button>
    </div>
  </td>
  <td>${stock.target}</td>
  <td style="font-weight:bold; color:${diff < 0 ? "var(--danger)" : "var(--text)"}">${diff > 0 ? "+" + diff : diff}</td>
  <td>${badge}</td>
`;

    tbody.appendChild(tr);
  });

  // Klick-Events für die Plus/Minus-Buttons neu binden
  tbody.querySelectorAll(".btn-stock-adjust").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const amt = parseInt(btn.dataset.amt);
      changeActualStock(id, amt);
    });
  });

  // Bestellliste im rechten Panel aktualisieren
  document.getElementById("order-preview").textContent =
    checkAndGenerateOrder(appComponents);
}

function changeActualStock(id, amount) {
  const item = appComponents.find((c) => c.id === id);
  if (!item) return;
  const currentActual = item.stocks[currentMachine].actual;
  if (currentActual + amount < 0) {
    showToast("Bestand kann nicht unter 0 sinken!");
    return;
  }
  item.stocks[currentMachine].actual = currentActual + amount;
  saveState();
  showToast(`${item.catalog}: Bestand geändert.`);
}

function renderAdmin() {
  // Dropdown befüllen
  document.getElementById("comp-category").innerHTML = appCategories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  // 1. Obergruppen-Tabelle rendern
  document.getElementById("admin-categories-body").innerHTML = appCategories
    .map(
      (cat, idx) => `
    <tr>
      <td>${cat}</td>
      <td><button class="btn btn-danger btn-sm btn-delete-cat" data-idx="${idx}">Löschen</button></td>
    </tr>
  `,
    )
    .join("");

  // 2. Gesamt-Komponenten-Katalog rendern
  // KORREKTUR: onclick="..." wurde entfernt und durch Klassen + data-Attribute ersetzt!
  document.getElementById("admin-components-body").innerHTML = appComponents
    .map((c) => {
      if (!c.stocks) c.stocks = {};
      return `
      <tr>
        <td><strong>${c.catalog}</strong></td>
        <td>${c.name}</td>
        <td>${c.category}</td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">
          G: ${c.stocks["FICEP Gemini"]?.actual ?? 0}/${c.stocks["FICEP Gemini"]?.target ?? 0}<br>
          S-B: ${c.stocks["FICEP Säge-Bohren"]?.actual ?? 0}/${c.stocks["FICEP Säge-Bohren"]?.target ?? 0}
        </td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-outline btn-sm btn-edit-comp" data-id="${c.id}">Edit</button>
            <button class="btn btn-danger btn-sm btn-delete-comp" data-id="${c.id}">X</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  // KORREKTUR: Event-Listener dynamisch zuweisen, damit Live Server / ES6 Module damit arbeiten können
  document.querySelectorAll(".btn-delete-cat").forEach((b) => {
    b.addEventListener("click", () => deleteCategory(parseInt(b.dataset.idx)));
  });

  document.querySelectorAll(".btn-edit-comp").forEach((b) => {
    b.addEventListener("click", () => editComponent(b.dataset.id));
  });

  document.querySelectorAll(".btn-delete-comp").forEach((b) => {
    b.addEventListener("click", () => deleteComponent(b.dataset.id));
  });
}

function handleCategorySubmit(e) {
  e.preventDefault();
  const input = document.getElementById("cat-name");
  const val = input.value.trim();
  if (val && !appCategories.includes(val)) {
    appCategories.push(val);
    input.value = "";
    saveState();
    showToast("Obergruppe hinzugefügt.");
  }
}

function deleteCategory(index) {
  if (confirm(`Obergruppe "${appCategories[index]}" wirklich löschen?`)) {
    appCategories.splice(index, 1);
    saveState();
  }
}

function handleComponentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("comp-id").value;
  const compData = {
    catalog: document.getElementById("comp-catalog").value.trim(),
    name: document.getElementById("comp-name").value.trim(),
    category: document.getElementById("comp-category").value,
    image: document.getElementById("comp-image").value.trim(),
    stocks: {
      "FICEP Gemini": {
        actual: Number(document.getElementById("comp-gemini-actual").value),
        target: Number(document.getElementById("comp-gemini-target").value),
      },
      "FICEP Säge-Bohren": {
        actual: Number(document.getElementById("comp-saege-actual").value),
        target: Number(document.getElementById("comp-saege-target").value),
      },
    },
  };

  if (id) {
    const index = appComponents.findIndex((c) => c.id === id);
    if (index !== -1) appComponents[index] = { id, ...compData };
  } else {
    appComponents.push({ id: "id_" + Date.now(), ...compData });
  }
  resetForm();
  saveState();
}

function editComponent(id) {
  const c = appComponents.find((item) => item.id === id);
  if (!c) return;
  document.getElementById("comp-id").value = c.id;
  document.getElementById("comp-catalog").value = c.catalog;
  document.getElementById("comp-name").value = c.name;
  document.getElementById("comp-category").value = c.category;
  document.getElementById("comp-image").value = c.image;
  document.getElementById("comp-gemini-actual").value =
    c.stocks["FICEP Gemini"]?.actual ?? 0;
  document.getElementById("comp-gemini-target").value =
    c.stocks["FICEP Gemini"]?.target ?? 0;
  document.getElementById("comp-saege-actual").value =
    c.stocks["FICEP Säge-Bohren"]?.actual ?? 0;
  document.getElementById("comp-saege-target").value =
    c.stocks["FICEP Säge-Bohren"]?.target ?? 0;
  document.getElementById("form-title").textContent = "Komponente bearbeiten";
}

function deleteComponent(id) {
  if (confirm("Komponente wirklich löschen?")) {
    appComponents = appComponents.filter((c) => c.id !== id);
    saveState();
  }
}

function importFromJson(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const file = files[0]; // Holt die ausgewählte Datei
  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);

      // Überprüfung, ob das JSON-Format unseren Arrays entspricht
      if (data.categories && data.components) {
        appCategories = data.categories;
        appComponents = data.components;

        // Speichert die Daten in die IndexedDB und rendert das UI neu
        saveState();

        showToast("JSON erfolgreich importiert!");
      } else {
        alert(
          "Fehler: Das JSON-Format ist ungültig (Kategorien oder Komponenten fehlen).",
        );
      }
    } catch (err) {
      console.error(err);
      alert(
        "Fehler beim Parsen der JSON-Datei. Stelle sicher, dass es eine gültige Datei ist.",
      );
    }
  };

  reader.onerror = function () {
    alert("Die Datei konnte nicht gelesen werden.");
  };

  reader.readAsText(file);
  e.target.value = ""; // Setzt das Feld zurück, damit dieselbe Datei mehrmals gewählt werden kann
}
function resetForm() {
  document.getElementById("component-form").reset();
  document.getElementById("comp-id").value = "";
  document.getElementById("form-title").textContent = "Komponente hinzufügen";
}
function copyToClipboard() {
  navigator.clipboard
    .writeText(document.getElementById("order-preview").textContent)
    .then(() => showToast("Bestellliste kopiert!"));
}
function sendEmail() {
  const emailInput = document.getElementById("order-email");
  const orderPreview = document.getElementById("order-preview");

  if (!emailInput || !orderPreview) return;

  const email = emailInput.value.trim();
  const subject = encodeURIComponent(
    "Kennametal Gesamt-Bestellanforderung (FICEP)",
  );
  const body = encodeURIComponent(orderPreview.textContent);

  // Öffnet den nativen Mail-Client auf dem PC oder Smartphone
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
}

async function triggerReset() {
  if (
    confirm(
      "Möchtest du alle App-Daten im Browser löschen und die components.json neu einlesen?",
    )
  ) {
    showToast("Setze Speicher zurück...");

    // 1. Schließe die aktive IndexedDB-Verbindung, falls vorhanden
    // Das verhindert die "onblocked"-Sperre im Browser
    if (typeof db !== "undefined" && db) {
      db.close();
    }

    // 2. Warte kurz, um dem Browser Zeit zum Schließen zu geben
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 3. Löschvorgang für die IndexedDB anfordern
    const deleteRequest = indexedDB.deleteDatabase("KennametalDB");

    deleteRequest.onblocked = function () {
      // Falls noch ein anderer Tab oder ein Hintergrund-Skript zugreift
      alert(
        "Das Zurücksetzen ist blockiert! Bitte schließe alle anderen offenen Tabs dieser App und versuche es erneut.",
      );
    };

    deleteRequest.onerror = function () {
      // Sicherheits-Fallback: Falls IndexedDB streikt, putzen wir zumindest den LocalStorage
      localStorage.clear();
      alert("Fehler beim Löschen der IndexedDB. LocalStorage wurde bereinigt.");
      location.reload();
    };

    deleteRequest.onsuccess = function () {
      // 4. LocalStorage ebenfalls komplett leeren
      localStorage.clear();

      showToast("Datenbank gelöscht! Start-Kaltstart wird ausgeführt...");

      // 5. Nach kurzem Moment die Seite neu laden und Cache umgehen
      setTimeout(() => {
        location.reload(true);
      }, 500);
    };
  }
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
// App starten
initApp();
