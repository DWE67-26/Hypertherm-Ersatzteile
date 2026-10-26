// Daten-Vorlagen (Seed), falls die DB noch leer ist
const SEED_CATEGORIES = [
  "Bohrkörper (Modular Drill Bodies)",
  "Bohrspitzen (Carbide Tips)",
];
const SEED_COMPONENTS = [
  {
    id: "1",
    catalog: "KenTIP FS 12.0mm 5xD",
    name: "Bohrkörper gerade Nut",
    category: "Bohrkörper (Modular Drill Bodies)",
    image: "kentip_body.png",
    stocks: {
      "FICEP Gemini": { actual: 2, target: 5 },
      "FICEP Säge-Bohren": { actual: 4, target: 4 },
    },
  },
  {
    id: "2",
    catalog: "KTFS1200H3 KC7315",
    name: "KenTIP FS Bohrspitze 12mm",
    category: "Bohrspitzen (Carbide Tips)",
    image: "kentip_tip.png",
    stocks: {
      "FICEP Gemini": { actual: 12, target: 20 },
      "FICEP Säge-Bohren": { actual: 5, target: 15 },
    },
  },
];

let db;

// Initialisiert IndexedDB und gibt ein Promise zurück
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("KennametalDB", 1);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("settings"))
        db.createObjectStore("settings");
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = () => reject("IndexedDB Error");
  });
}

// Lädt die gesamten Daten aus der DB
// Passe diesen Abschnitt in deiner js/database.js an:
export function loadAppData() {
  return new Promise((resolve) => {
    const transaction = db.transaction(["settings"], "readonly");
    const store = transaction.objectStore("settings");
    const request = store.get("toolData");
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        // KORREKTUR: Gibt ein leeres Array zurück, damit die App nicht mit den alten Seed-Werten blockiert
        resolve({
          categories: [
            "Bohrkörper (Modular Drill Bodies)",
            "Bohrspitzen (Carbide Tips)",
          ],
          components: [],
        });
      }
    };
  });
}

// Speichert den Zustand in der DB
export function saveAppData(categories, components) {
  if (!db) return;
  const transaction = db.transaction(["settings"], "readwrite");
  const store = transaction.objectStore("settings");
  store.put({ categories, components }, "toolData");
}

// JSON-Export Trigger
export function exportToJsonFile(categories, components) {
  const dataStr = JSON.stringify({ categories, components }, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `kennametal_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
