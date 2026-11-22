/** Small, kid-friendly comparisons shown while printing. */

export function funFacts(filamentMm: number, printSeconds: number, layers: number | null): string[] {
  const meters = filamentMm / 1000;
  const facts: string[] = [];

  const fmt = (n: number) => n.toFixed(1).replace(".", ",");
  if (meters >= 4.5) {
    facts.push(`Printeren har lagt ut ${fmt(meters)} meter plast – like langt som ${fmt(meters / 4.5)} biler etter hverandre! 🚗`);
  } else if (meters >= 0.5) {
    // A kid is roughly 1.4 m tall.
    facts.push(`Printeren har lagt ut ${fmt(meters)} meter plasttråd – det er ${fmt(meters / 1.4)} ganger så langt som du er høy! 📏`);
  }
  if (layers && layers > 5) {
    facts.push(`Hvert lag er bare 0,2 mm tykt – tynnere enn et ark! Printeren har allerede laget ${layers} lag. 🥞`);
  }
  if (printSeconds > 600) {
    const songs = Math.floor(printSeconds / 210);
    facts.push(`Printeren har jobbet like lenge som ${songs} sanger på radioen. 🎵`);
  }
  facts.push("Dysen er over 200 grader varm – mye varmere enn kokende vann! 🔥");
  facts.push("Printeren bygger alt nedenfra og opp, ett lag om gangen. 🧱");
  facts.push("Plasten som brukes heter PLA og er laget av planter, som mais! 🌽");
  return facts;
}
