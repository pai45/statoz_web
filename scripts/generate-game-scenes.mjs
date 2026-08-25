import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "public/assets/games";
mkdirSync(OUT, { recursive: true });

// Token values, resolved to literals. An SVG loaded through <img> is its own
// document and cannot see the page's custom properties.
const CYAN = "#5cdfff";
const LIME = "#51ff94";
const GOLD = "#fdc700";
const RACING = "#f42d29";
const VIOLET = "#c27aff";
const ORANGE = "#ff8904";
const PINK = "#ff94c1";
const DANGER = "#ff4d4d";
const LINE = "#314158";
const PLATE = "#0d111a";

const art = {
  courtWood: "#665116",
  outfield: "#153e36",
  cricketStrip: "#8b7545",
  turf: "#124b43",
  tennisCourt: "#1f475e",
  boardLight: "#514718",
  boardDark: "#202b31",
  leather: "#f3f6f8",
  ballWhite: "#edf4f6",
  ballMark: "#18202a",
  seam: "#17120a",
  marking: "#ffffff",
  quizPlate: "#241a33",
  bingoPlate: "#16243a",
  silhouette: "#16241d",
};

/** Cropped to the art's own bounds; edges the scene deliberately runs off stay clipped. */
const VIEW_BOX = "100 -4 120 128";

function doc(title, body) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" role="img" aria-label="${title}">`,
    `  <title>${title}</title>`,
    body
      .trim()
      .split("\n")
      .map((l) => `  ${l.trim()}`)
      .join("\n"),
    `</svg>`,
    ``,
  ].join("\n");
}

const scenes = {};

/* ---- pitch duel: a tactics board with a passing route ------------------ */
{
  const nodes = [
    [138, 92.4],
    [172, 69.6],
    [150, 40.8],
    [188, 27.6],
  ];
  scenes["pitch-duel"] = doc(
    "Tactics board with a passing route",
    `
<g fill="none" stroke="${art.marking}" stroke-opacity="0.42" stroke-width="1.2">
<rect x="114" y="12" width="92" height="110.4" fill="${art.turf}"/>
<path d="M114 67.2H206"/>
<circle cx="160" cy="67.2" r="27"/>
<rect x="119" y="-14" width="82" height="52"/>
</g>
<polyline points="${nodes.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${CYAN}" stroke-opacity="0.65" stroke-width="1.5"/>
${nodes
  .map(
    ([x, y], i) =>
      `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${CYAN}" stroke-opacity="0.34"/>\n<circle cx="${x}" cy="${y}" r="7" fill="${i === nodes.length - 1 ? GOLD : CYAN}"/>`,
  )
  .join("\n")}
`,
  );
}

/* ---- penalty shootout: a netted goal, a target, and the ball ----------- */
{
  const netX = [1, 2, 3, 4].map((i) => 124 + (72 * i) / 5);
  const netY = [1, 2, 3].map((i) => 21.6 + (52.8 * i) / 4);
  scenes["penalty-shootout"] = doc(
    "Goal, target, and ball",
    `
<g stroke="${LIME}" stroke-opacity="0.28" stroke-width="0.8">
${netX.map((x) => `<path d="M${x} 21.6V74.4"/>`).join("\n")}
${netY.map((y) => `<path d="M124 ${y}H196"/>`).join("\n")}
</g>
<rect x="124" y="21.6" width="72" height="52.8" fill="none" stroke="${art.marking}" stroke-opacity="0.6" stroke-width="2.6"/>
<path d="M158 82.8 164 48.8" stroke="${LIME}" stroke-opacity="0.34" stroke-width="2"/>
<g fill="none" stroke="${LIME}" stroke-opacity="0.55" stroke-width="1.4">
<circle cx="172" cy="40.8" r="24"/>
<circle cx="172" cy="40.8" r="15"/>
</g>
<circle cx="172" cy="40.8" r="6" fill="${LIME}" fill-opacity="0.92"/>
<circle cx="148" cy="94.8" r="15" fill="${art.ballWhite}"/>
<g fill="${art.ballMark}">
<circle cx="148" cy="94.8" r="5"/>
<circle cx="139" cy="87.8" r="3.2"/>
<circle cx="157" cy="87.8" r="3.2"/>
<circle cx="140" cy="102.8" r="3.2"/>
<circle cx="156" cy="102.8" r="3.2"/>
</g>
`,
  );
}

/* ---- football chess: a five-by-five board mid-duel --------------------- */
{
  const cw = 84 / 5;
  const ch = 110.4 / 5;
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      cells.push(
        `<rect x="${+(118 + col * cw).toFixed(2)}" y="${+(12 + row * ch).toFixed(2)}" width="${+cw.toFixed(2)}" height="${+ch.toFixed(2)}" fill="${(row + col) % 2 === 0 ? art.boardLight : art.boardDark}"/>`,
      );
    }
  }
  const pieces = [
    [138, 88.8, CYAN],
    [168, 88.8, CYAN],
    [152, 66, CYAN],
    [182, 43.2, GOLD],
    [138, 32.4, GOLD],
  ];
  scenes["football-chess"] = doc(
    "Five-by-five board mid-duel",
    `
${cells.join("\n")}
<rect x="118" y="12" width="84" height="110.4" fill="none" stroke="${GOLD}" stroke-opacity="0.72" stroke-width="1.4"/>
<path d="M152 66 182 43.2" stroke="${GOLD}" stroke-opacity="0.58" stroke-width="2"/>
${pieces
  .map(
    ([x, y, c]) =>
      `<circle cx="${x}" cy="${y}" r="13" fill="none" stroke="${c}" stroke-opacity="0.34"/>\n<circle cx="${x}" cy="${y}" r="9" fill="${c}"/>`,
  )
  .join("\n")}
`,
  );
}

/* ---- final over: the strip, the stumps, and a ball in flight ----------- */
scenes["final-over"] = doc(
  "Cricket strip with stumps and a ball in flight",
  `
<ellipse cx="158" cy="66" rx="58" ry="40.8" fill="${art.outfield}"/>
<path d="M148 24H168L192 122.4H114Z" fill="${art.cricketStrip}" stroke="${CYAN}" stroke-opacity="0.48" stroke-width="1.2"/>
<path d="M122 99.6H186" stroke="${art.marking}" stroke-opacity="0.66" stroke-width="1.3"/>
<g stroke="${CYAN}" stroke-width="2.2" stroke-linecap="round">
<path d="M154 33.6V57.6"/>
<path d="M160 33.6V57.6"/>
<path d="M166 33.6V57.6"/>
</g>
<path d="M153 36H167" stroke="${CYAN}" stroke-width="2"/>
<path d="M144 62.4 176 78" stroke="${CYAN}" stroke-opacity="0.28" stroke-width="2"/>
<circle cx="176" cy="78" r="7" fill="${art.leather}"/>
<path d="M177.8 73.3A5 5 0 0 1 177.8 82.7" fill="none" stroke="${DANGER}" stroke-width="1"/>
`,
);

/* ---- hoop duel: a street court in perspective -------------------------- */
scenes["hoop-duel"] = doc(
  "Street basketball court in perspective",
  `
<path d="M128 19.2H200V120H104Z" fill="${art.courtWood}" stroke="${GOLD}" stroke-opacity="0.58" stroke-width="1.2"/>
<g fill="none" stroke="${GOLD}" stroke-opacity="0.58" stroke-width="1.2">
<ellipse cx="158" cy="87.6" rx="54" ry="38"/>
<path d="M164 19.2V62.4"/>
</g>
<path d="M148 33.6H182" stroke="${art.marking}" stroke-opacity="0.55" stroke-width="3"/>
<ellipse cx="164" cy="46.8" rx="18" ry="5" fill="none" stroke="${GOLD}" stroke-width="3"/>
<circle cx="182" cy="72" r="17" fill="${GOLD}"/>
<g fill="none" stroke="${art.seam}" stroke-opacity="0.78" stroke-width="1.4">
<path d="M165 72H199"/>
<path d="M182 55V89"/>
<ellipse cx="182" cy="72" rx="8" ry="17"/>
</g>
`,
);

/* ---- grand prix dash: circuit telemetry with a car on the line --------- */
{
  const track = "M140 -12C202 12 136 51.6 168 73.2C196 93.6 144 104.4 192 129.6";
  scenes["grand-prix-dash"] = doc(
    "Circuit telemetry with a car on the racing line",
    `
<g fill="none" stroke-linecap="round">
<path d="${track}" stroke="${LINE}" stroke-width="42"/>
<path d="${track}" stroke="${RACING}" stroke-opacity="0.22" stroke-width="46"/>
<path d="${track}" stroke="${CYAN}" stroke-opacity="0.34" stroke-width="1.3"/>
</g>
<g transform="rotate(-12.6 164 72)">
<rect x="140" y="63" width="48" height="18" rx="5" fill="${RACING}"/>
<rect x="157.5" y="66" width="17" height="12" rx="5" fill="${PLATE}"/>
<g fill="${PLATE}">
<rect x="145.5" y="59.5" width="13" height="5" rx="2"/>
<rect x="171.5" y="59.5" width="13" height="5" rx="2"/>
<rect x="145.5" y="79.5" width="13" height="5" rx="2"/>
<rect x="171.5" y="79.5" width="13" height="5" rx="2"/>
</g>
</g>
`,
  );
}

/* ---- tennis rally: a court in perspective, ball mid-air ---------------- */
scenes["tennis-rally"] = doc(
  "Tennis court in perspective with the ball mid-air",
  `
<path d="M134 14.4H188L216 123.6H96Z" fill="${art.tennisCourt}" stroke="${CYAN}" stroke-opacity="0.52"/>
<g fill="none" stroke="${CYAN}" stroke-opacity="0.52">
<path d="M114 68.4H200"/>
<path d="M150 14.4 134 120"/>
</g>
<ellipse cx="166" cy="93.6" rx="13.5" ry="4.5" fill="none" stroke="${LIME}" stroke-opacity="0.36" stroke-width="1.5"/>
<circle cx="166" cy="46.8" r="6" fill="${LIME}"/>
`,
);

/* ---- football quiz: four options, one answered ------------------------- */
scenes["quiz"] = doc(
  "Four answer options with one chosen",
  `
<g stroke="${VIOLET}" stroke-opacity="0.35" stroke-width="1.2">
<rect x="112" y="14" width="46" height="46" fill="${art.quizPlate}"/>
<rect x="112" y="66" width="46" height="46" fill="${art.quizPlate}"/>
<rect x="164" y="66" width="46" height="46" fill="${art.quizPlate}"/>
</g>
<g fill="${VIOLET}" fill-opacity="0.4">
<circle cx="124" cy="37" r="4"/>
<circle cx="124" cy="89" r="4"/>
<circle cx="176" cy="89" r="4"/>
</g>
<rect x="164" y="14" width="46" height="46" fill="${VIOLET}" fill-opacity="0.18" stroke="${VIOLET}" stroke-opacity="0.9" stroke-width="1.6"/>
<path d="M172 37 182 47 202 25" fill="none" stroke="${VIOLET}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
`,
);

/* ---- football bingo: a card with a line daubed ------------------------- */
{
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      cells.push(
        `<rect x="${110 + col * 20}" y="${10 + row * 20}" width="20" height="20" fill="${art.bingoPlate}" stroke="${CYAN}" stroke-opacity="0.22"/>`,
      );
    }
  }
  const daubed = [0, 1, 2, 3, 4].map(
    (i) => `<circle cx="${120 + i * 20}" cy="${20 + i * 20}" r="7" fill="${CYAN}"/>`,
  );
  scenes["bingo"] = doc(
    "Bingo card with a winning line daubed",
    `
${cells.join("\n")}
<rect x="110" y="10" width="100" height="100" fill="none" stroke="${ORANGE}" stroke-opacity="0.6" stroke-width="1.4"/>
<path d="M120 20 200 100" stroke="${ORANGE}" stroke-opacity="0.45" stroke-width="2.5"/>
${daubed.join("\n")}
`,
  );
}

/* ---- guess the player: a redacted silhouette --------------------------- */
scenes["guess-player"] = doc(
  "Redacted player silhouette",
  `
<path d="M118 122C118 88 137 72 160 72C183 72 202 88 202 122Z" fill="${art.silhouette}" stroke="${PINK}" stroke-opacity="0.55" stroke-width="1.4"/>
<circle cx="160" cy="42" r="23" fill="${art.silhouette}" stroke="${PINK}" stroke-opacity="0.55" stroke-width="1.4"/>
<rect x="104" y="34" width="112" height="9" fill="${PINK}" fill-opacity="0.5"/>
<g fill="${PINK}" fill-opacity="0.3">
<rect x="130" y="92" width="30" height="7"/>
<rect x="166" y="92" width="18" height="7"/>
<rect x="130" y="105" width="20" height="7"/>
</g>
`,
);


/* ---- guess the driver: a redacted helmet ------------------------------- */
scenes["guess-driver"] = doc(
  "Redacted driver helmet",
  `
<path d="M114 78C114 48 134 28 160 28C186 28 206 48 206 78C206 96 196 110 180 116L134 116C122 110 114 96 114 78Z" fill="${art.silhouette}" stroke="${PINK}" stroke-opacity="0.55" stroke-width="1.4"/>
<path d="M128 74C128 62 140 54 160 54C180 54 192 62 192 74L192 84L128 84Z" fill="${PINK}" fill-opacity="0.22" stroke="${PINK}" stroke-opacity="0.5" stroke-width="1.2"/>
<rect x="104" y="66" width="112" height="9" fill="${PINK}" fill-opacity="0.5"/>
<g fill="${PINK}" fill-opacity="0.3">
<rect x="132" y="98" width="30" height="7"/>
<rect x="168" y="98" width="16" height="7"/>
</g>
`,
);

/* ---- guess the winner: a redacted trophy ------------------------------- */
scenes["guess-winner"] = doc(
  "Redacted trophy",
  `
<path d="M136 24H184V56C184 71 173 82 160 82C147 82 136 71 136 56Z" fill="${art.silhouette}" stroke="${CYAN}" stroke-opacity="0.55" stroke-width="1.4"/>
<path d="M136 32H124V44C124 53 129 58 136 59" fill="none" stroke="${CYAN}" stroke-opacity="0.5" stroke-width="1.4"/>
<path d="M184 32H196V44C196 53 191 58 184 59" fill="none" stroke="${CYAN}" stroke-opacity="0.5" stroke-width="1.4"/>
<path d="M154 82H166V96H154Z" fill="${art.silhouette}" stroke="${CYAN}" stroke-opacity="0.55" stroke-width="1.4"/>
<rect x="136" y="96" width="48" height="10" fill="${CYAN}" fill-opacity="0.22" stroke="${CYAN}" stroke-opacity="0.5" stroke-width="1.2"/>
<rect x="104" y="46" width="112" height="9" fill="${CYAN}" fill-opacity="0.5"/>
<g fill="${CYAN}" fill-opacity="0.3">
<rect x="130" y="112" width="30" height="7"/>
<rect x="166" y="112" width="18" height="7"/>
</g>
`,
);

for (const [name, svg] of Object.entries(scenes)) {
  writeFileSync(join(OUT, `${name}.svg`), svg, "utf8");
}
console.log(`wrote ${Object.keys(scenes).length} scenes to ${OUT}`);
