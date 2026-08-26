/**
 * Responsive/overflow audit via the Chrome DevTools Protocol.
 *
 * --window-size on Windows is clamped by a minimum window width, so a 375px
 * screenshot can be a crop of a wider render. Emulation.setDeviceMetricsOverride
 * forces a genuine viewport, which is the only reliable way to test 375px.
 *
 * Usage: node scripts/audit-responsive.mjs <url> <width> <height> <outPng>
 */

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, widthArg, heightArg, outPng] = process.argv.slice(2);
const width = Number(widthArg ?? 375);
const height = Number(heightArg ?? 812);

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

const PORT = 9333;

const chrome = spawn(
  CHROME_CANDIDATES.find(Boolean),
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--remote-debugging-port=${PORT}`,
    "--user-data-dir=" + process.env.TEMP + "/cdp-audit-profile",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint never became available");
}

const wsUrl = await getTarget();
const ws = new WebSocket(wsUrl);
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

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 768,
});
await send("Page.navigate", { url });
await sleep(2600); // let fonts + client render settle

const probe = `(() => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 80),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 44),
      });
    }
  }
  return JSON.stringify({
    innerWidth: window.innerWidth,
    clientWidth: vw,
    scrollWidth: de.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflowPx: de.scrollWidth - vw,
    offenderCount: offenders.length,
    offenders: offenders.slice(0, 18),
  }, null, 2);
})()`;

const { result } = await send("Runtime.evaluate", {
  expression: probe,
  returnByValue: true,
});
console.log(result.value);

if (outPng) {
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(outPng, Buffer.from(shot.data, "base64"));
  console.log(`\nscreenshot -> ${outPng}`);
}

ws.close();
chrome.kill();
