/**
 * Captures the screenshots the root README references, into ../screenshots/.
 *
 * Drives a real headless Chrome over the DevTools Protocol so the app is
 * exercised the way a visitor would: it selects the invoice, flips the demo
 * switch, waits for both API stages to settle, then shoots. Each shot reads the
 * rendered status strip back and prints it, so a screenshot can't silently
 * capture the wrong state.
 *
 * Needs a server running (`npm run dev`, or `npm run build && npm start`):
 *   node scripts/capture-screenshots.mjs [port]
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.argv[2] ?? "3000";
const TARGET_URL = `http://127.0.0.1:${PORT}/`;

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "..", "screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

const CDP_PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME_CANDIDATES.find(Boolean),
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${CDP_PORT}`,
    "--user-data-dir=" + process.env.TEMP + "/cdp-shots-profile",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint never became available");
}

const ws = new WebSocket(await getTarget());
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
});

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? "evaluate failed");
  return result.value;
}

await send("Page.enable");
await send("Runtime.enable");

/** Clicks the queue row (>=sm) or drives the <select> (<sm) for an invoice id. */
const selectInvoice = (id) => `(() => {
  const row = [...document.querySelectorAll('button[aria-pressed]')]
    .find((b) => b.textContent.includes(${JSON.stringify(id)}));
  if (row && row.offsetParent !== null) { row.click(); return 'clicked row'; }

  // React controls the select, so set the value through the native setter and
  // dispatch a bubbling change event — assigning .value alone is a no-op to React.
  const sel = document.getElementById('invoice-select');
  if (!sel) return 'no control found';
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')
    .set.call(sel, ${JSON.stringify(id)});
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return 'used select';
})()`;

const setToggle = (on) => `(() => {
  const box = document.querySelector('input[type=checkbox]');
  if (!box) return 'no toggle';
  if (box.checked !== ${on}) box.click();
  return 'toggle=' + box.checked;
})()`;

/**
 * Reads the status strip + the callouts, so each shot verifies itself.
 *
 * innerText is the *rendered* text, so it has text-transform applied — several
 * of these strings are uppercased by CSS. Compare case-insensitively.
 */
const READ_STATE = `(() => {
  const strip = {};
  for (const item of document.querySelectorAll('div.items-baseline')) {
    const spans = item.querySelectorAll('span');
    if (spans.length >= 2) strip[spans[0].textContent.trim()] = spans[1].textContent.trim();
  }
  const text = document.body.innerText.toLowerCase();
  return JSON.stringify({
    strip,
    settled: !['…', '—'].includes(strip.checker ?? ''),
    doNotPay: text.includes('do not pay'),
    override: text.includes('overridden rule'),
    simulated: text.includes('simulated'),
    overflowPx: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  });
})()`;

/**
 * Polls until both stages have settled and stay settled.
 *
 * The two-consecutive-reads requirement matters: right after an interaction,
 * React has not yet cleared the previous result, so a single read can return
 * the *old* settled state and shoot the wrong frame.
 */
async function waitForStable(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  let streak = 0;
  for (;;) {
    const state = JSON.parse(await evaluate(READ_STATE));
    streak = state.settled ? streak + 1 : 0;
    if (streak >= 2) return state;
    if (Date.now() > deadline) {
      throw new Error(`stages never settled (checker="${state.strip.checker}")`);
    }
    await sleep(350);
  }
}

const SHOTS = [
  {
    file: "05-empty.png",
    width: 1440,
    height: 900,
    steps: [],
    note: "empty state, nothing selected yet",
  },
  {
    file: "01-overview.png",
    width: 1440,
    height: 900,
    steps: [selectInvoice("NL-4471")],
    note: "NL-4471 — FLAG, maker and checker agree",
  },
  {
    file: "02-mismatch.png",
    width: 1440,
    height: 900,
    steps: [selectInvoice("NL-4471"), setToggle(true)],
    note: "dishonest maker caught — MISMATCH + do-not-pay warning",
  },
  {
    file: "03-override.png",
    width: 1440,
    height: 900,
    // Every shot starts from a fresh navigation, so the demo switch is already
    // off here — no need to reset it.
    steps: [selectInvoice("HF-2287")],
    note: "HF-2287 — exact $10,000 boundary, rule 1 overrides rule 2",
  },
  {
    file: "04-mobile.png",
    width: 375,
    height: 812,
    steps: [selectInvoice("NL-4471")],
    note: "375px stacked layout with the invoice dropdown",
  },
];

for (const shot of SHOTS) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: 1,
    mobile: shot.width < 768,
  });

  await send("Page.navigate", { url: TARGET_URL });
  await sleep(1600); // hydration + web fonts

  for (const step of shot.steps) {
    await evaluate(step);
    await sleep(200); // let React start the run before it is observed
  }

  // Only the shots that interact have a run to wait for; the empty-state shot
  // is already in its final state straight off the navigation.
  if (shot.steps.length > 0) await waitForStable();
  await sleep(250); // let the settled frame paint

  const state = JSON.parse(await evaluate(READ_STATE));
  const png = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  writeFileSync(join(OUT_DIR, shot.file), Buffer.from(png.data, "base64"));

  const flags = [
    state.doNotPay && "do-not-pay",
    state.override && "override",
    state.simulated && "simulated",
    state.overflowPx > 0 && `OVERFLOW+${state.overflowPx}px`,
  ]
    .filter(Boolean)
    .join(" ");

  console.log(
    `${shot.file.padEnd(17)} ${String(shot.width).padStart(4)}px  ` +
      `maker=${String(state.strip.maker).padEnd(14)}` +
      `checker=${String(state.strip.checker).padEnd(11)}` +
      `${flags.padEnd(24)}${shot.note}`,
  );
}

console.log(`\nWrote ${SHOTS.length} screenshots to ${OUT_DIR}`);

ws.close();
chrome.kill();
