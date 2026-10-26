export function checkAndGenerateOrder(components) {
  const orderPositions = [];

  // 1. Alle Komponenten durchgehen und Fehlmengen prüfen
  components.forEach((c) => {
    const geminiActual = c.stocks["FICEP Gemini"]?.actual || 0;
    const geminiTarget = c.stocks["FICEP Gemini"]?.target || 0;
    const saegeActual = c.stocks["FICEP Säge-Bohren"]?.actual || 0;
    const saegeTarget = c.stocks["FICEP Säge-Bohren"]?.target || 0;

    // Bedarf für die einzelnen Maschinen berechnen
    const geminiBedarf =
      geminiTarget > geminiActual ? geminiTarget - geminiActual : 0;
    const saegeBedarf =
      saegeTarget > saegeActual ? saegeTarget - saegeActual : 0;
    const gesamtBedarf = geminiBedarf + saegeBedarf;

    // Wenn mindestens auf einer Maschine Bedarf besteht, Position merken
    if (gesamtBedarf > 0) {
      orderPositions.push({
        catalog: c.catalog,
        name: c.name,
        gesamt: gesamtBedarf,
        gemini: geminiBedarf,
        saege: saegeBedarf,
      });
    }
  });

  // Wenn kein einziger Artikel Fehlbestand hat
  if (orderPositions.length === 0) {
    return "Kein Fehlbestand vorhanden. Beide FICEP-Anlagen sind ausreichend gedeckt.";
  }

  // 2. Text für die E-Mail / Zwischenablage generieren
  let text = `KENNAMETAL KONSOLIDIERTE BESTELLANFORDERUNG (FICEP)\n`;
  text += `Datum: ${new Date().toLocaleDateString()}\n`;
  text += `=======================================================\n`;
  text += `Bestellnummer        | Bezeichnung          | Menge  \n`;
  text += `-------------------------------------------------------------------------------------\n`;

  orderPositions.forEach((p) => {
    // Aufteilungs-Text generieren
    let aufteilung = "";
    if (p.gemini > 0 && p.saege > 0) {
      aufteilung = `G: ${p.gemini} / S-B: ${p.saege}`;
    } else if (p.gemini > 0) {
      aufteilung = `Nur Gemini`;
    } else {
      aufteilung = `Nur Säge-Bohren`;
    }

    text += `${p.catalog.padEnd(20, " ")} | ${p.name.padEnd(20, " ").substring(0, 20)} | Stk: ${p.gesamt.toString().padEnd(2, " ")} \n`;
  });

  text += `=======================================================`;
  return text;
}
