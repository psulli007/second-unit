// Filming your product ON A SITE YOU DO NOT CONTROL — a customer's live site, a partner's
// staging install, a demo tenant built from someone else's theme — rather than on the
// localhost harness the other recorders drive.
//
// Why this exists: for anything embedded (a widget, a plugin, a script tag, a checkout), a
// meaningful part of the product only exists once it is in a host page. Hash-link handlers,
// floating rails, and anything the host's CSS touches cannot be filmed in isolation. The
// footage that convinces people is the product on a page that was not built for the demo.
//
// It also brings a problem the localhost recorders never have: everything ELSE on that page
// belongs to someone else. Their brand, their author photo, their ad network, their email
// capture. Two different situations, two different setups here:
//
//   setupPlainSite() — a CONSENTING site filmed AS ITSELF. Nothing is rewritten. Only
//                      third-party ad and tracker hosts are blocked, so a stranger's
//                      creative never lands in a frame you are about to publish.
//
//   setupSite()      — a demo install built from someone else's theme, filmed as your own
//                      brand. Text, display attributes, and named assets are substituted.
//
// The line between them matters. Rewriting a real publisher's name out of footage you then
// present as your own customer is a misrepresentation; rewriting a theme's stock branding
// out of YOUR demo tenant is housekeeping. Get permission for the first case and you don't
// need the second.
//
// Hard limits worth knowing before you plan a shoot:
//   - No redactor can touch PIXELS. A name baked into a photo, a watermark, a logo inside a
//     hero image survives everything here. Check a contact sheet of the frames before you
//     cut, and frame the shot so the residue stays small — or pick a different page.
//   - Never rewrite a URL the browser is about to FETCH. Rewriting asset hostnames to match
//     a text substitution strips the site's own CSS; the page renders unstyled and the take
//     is dead. Text and display attributes only.
const https = require('https');
const { execFileSync } = require('child_process');
const path = require('path');
const { TAP_INIT } = require('./mobile-common');
const { cfg } = require('../lib/config');

const SITE = cfg.SITE_URL || '';

// Ad exchanges, consent managers, and audience trackers. Blocked rather than hidden: an ad
// that never loads cannot reflow the page mid-take, and a consent dialog that never mounts
// cannot cover your product at second 4. Extend per shoot with `extraBlockedHosts`.
const AD_HOSTS = [
  'doubleclick.net', 'googlesyndication.com', 'amazon-adsystem.com', 'criteo.com',
  'liadm.com', 'intentiq.com', '3lift.com', 'openx.net', 'scorecardresearch.com',
  'rubiconproject.com', 'adnxs.com', 'tapad.com', 'rlcdn.com', 'optable.co',
  'consentmanager.net', 'scorecardresearch.com',
];

// A redactor that starts at DOCUMENT START.
//
// `mobile-common.redactScript` waits for DOMContentLoaded, which is fine for an app you
// control. A CMS theme streams its header — site name, author name — long before DCL, and a
// take caught the raw name on screen at 3 seconds. This one also covers display attributes
// (title/alt/aria-label/placeholder) and <title>, and survives `document.documentElement`
// still being null when an init script runs, which is why the observer attaches on the first
// tick that has one instead of immediately.
//
// STYLE/SCRIPT/NOSCRIPT text is skipped: substituting inside a stylesheet or a JSON-LD blob
// changes behaviour rather than appearance.
function earlyRedactScript(pairs = []) {
  return `(() => {
    const MAP = ${JSON.stringify(pairs)};
    if (!MAP.length) return;
    const apply = (s) => { let o = s; for (const [a,b] of MAP) { if (o.indexOf(a) !== -1) o = o.split(a).join(b); } return o; };
    const scrub = () => { try {
      const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => { const t = n.parentNode && n.parentNode.tagName; return (t === 'STYLE' || t === 'SCRIPT' || t === 'NOSCRIPT') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
      });
      const ns = []; while (w.nextNode()) ns.push(w.currentNode);
      for (const n of ns) { const v = n.nodeValue; if (v) { const nv = apply(v); if (nv !== v) n.nodeValue = nv; } }
      for (const el of document.querySelectorAll('[title],[alt],[aria-label],[placeholder]')) {
        for (const at of ['title','alt','aria-label','placeholder']) { const v = el.getAttribute(at); if (v) { const nv = apply(v); if (nv !== v) el.setAttribute(at, nv); } }
      }
      if (document.title) { const t = apply(document.title); if (t !== document.title) document.title = t; }
    } catch (e) {} };
    let observing = false;
    const tick = () => {
      if (!observing && document.documentElement) {
        try { new MutationObserver(scrub).observe(document.documentElement, { childList:true, subtree:true, characterData:true }); observing = true; } catch (e) {}
      }
      scrub();
    };
    setInterval(tick, 150);
    tick();
  })();`;
}

// Hide an element of the HOST page that competes with what you are filming — a theme's own
// email capture sitting where your product's call to action goes, a sticky newsletter bar.
//
// The retry loop is not paranoia: appending on the first tick threw (no <head>, no
// documentElement) and a take shipped with the box visible.
//
// Hide host chrome only. Hiding part of YOUR OWN product to make a feature look cleaner than
// it ships is the line this must not cross.
function hideScript(selectors = []) {
  if (!selectors.length) return '';
  return `(() => {
    const add = () => {
      try {
        if (document.getElementById('vs-studio-host-hide')) return true;
        const root = document.head || document.documentElement;
        if (!root) return false;
        const s = document.createElement('style');
        s.id = 'vs-studio-host-hide';
        s.textContent = ${JSON.stringify(selectors.join(','))} + '{display:none!important}';
        root.appendChild(s);
        return true;
      } catch (e) { return false; }
    };
    document.addEventListener('DOMContentLoaded', add);
    if (!add()) { const iv = setInterval(() => { if (add()) clearInterval(iv); }, 10); }
  })();`;
}

// A CONSENTING site, filmed as itself. No substitution, no asset swaps — only third-party
// ad/tracker hosts blocked. Desktop by default. The caller adds its own init scripts
// (cursor, popover suppression) before navigating.
async function setupPlainSite(browserType, { viewport = { width: 1280, height: 720 }, dsf = 3, extraBlockedHosts = [], userAgent, videoDir } = {}) {
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport, deviceScaleFactor: dsf,
    ...(userAgent ? { userAgent } : {}),
    ...(videoDir ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
  });
  const blocked = AD_HOSTS.concat(extraBlockedHosts);
  await context.route((url) => blocked.some((h) => url.hostname.endsWith(h) || url.href.includes(h)), (r) => r.abort());
  const page = await context.newPage();
  return { browser, context, page };
}

// A demo install built from someone else's theme, filmed as your brand.
//
//   redact       [[find, replace], …]  text + display attributes, from document start
//   swapAssets   [[urlGlob, {contentType, body}], …]  served in place of the real response.
//                Use for a logo file and for avatars: a stock author photo is a likeness of
//                a real person, which a text substitution does nothing about.
//   hide         CSS selectors of host chrome to suppress
//   mobile       phone viewport + touch + an iOS UA (default true)
//   recordVideo  Playwright's recorder captures CSS px and PADS to a larger size rather than
//                scaling, so it is fine for probes and soft for masters. For publishable
//                footage pass recordVideo:false with a viewport + dsf and capture frames with
//                stopmo-common's makeTimeline instead — those screenshots are real resolution.
async function setupSite(browserType, {
  videoDir, mobile = true, recordVideo = true, viewport, dsf,
  redact = [], swapAssets = [], hide = [], extraBlockedHosts = [], tapRipple = true,
} = {}) {
  const browser = await browserType.launch();
  viewport = viewport || (mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dsf || (mobile ? 2 : 1),
    isMobile: mobile,
    hasTouch: mobile,
    ...(mobile ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } : {}),
    ...(recordVideo ? { recordVideo: { dir: videoDir, size: viewport } } : {}),
  });
  const blocked = AD_HOSTS.concat(extraBlockedHosts);
  await context.route((url) => blocked.some((h) => url.hostname.endsWith(h) || url.href.includes(h)), (r) => r.abort());
  for (const [glob, res] of swapAssets) {
    await context.route(glob, (r) => r.fulfill({ status: 200, contentType: res.contentType || 'image/svg+xml', body: res.body }));
  }
  if (redact.length) await context.addInitScript(earlyRedactScript(redact));
  if (tapRipple && mobile) await context.addInitScript(TAP_INIT);
  const hideJs = hideScript(hide);
  if (hideJs) await context.addInitScript(hideJs);
  const page = await context.newPage();
  return { browser, context, page };
}

// Is the build deployed to the site at least as new as your local checkout?
//
// Filming an embedded product means filming whatever the host page loads, which is a DEPLOY,
// not your working tree. A stale deploy gives you a take of UI that no longer exists — found
// out the expensive way. Compares the asset's Last-Modified against the checkout's HEAD date.
function lastModified(url) {
  return new Promise((resolve, reject) => {
    // resume() drains the response; without it the open socket keeps Node alive after recording.
    https.request(url, { method: 'HEAD', agent: false }, (res) => { res.resume(); resolve(res.headers['last-modified'] || null); }).on('error', reject).end();
  });
}
async function checkDeploy({ assetUrl, repoDir } = {}) {
  assetUrl = assetUrl || cfg.SITE_ASSET_URL;
  repoDir = repoDir || path.join(__dirname, '..', 'app');
  if (!assetUrl) { console.log('no SITE_ASSET_URL configured — skipping the deploy freshness check'); return true; }
  const deployed = await lastModified(assetUrl);
  const head = execFileSync('git', ['-C', repoDir, 'log', '-1', '--format=%h %cI %s']).toString().trim();
  const headTime = new Date(head.split(' ')[1]);
  const fresh = deployed && new Date(deployed) >= headTime;
  console.log(`local HEAD:     ${head}`);
  console.log(`deployed asset: ${deployed}`);
  console.log(fresh ? 'OK: the deploy is newer than local HEAD.' : 'WARN: the deploy predates local HEAD. The site may not show the newest UI.');
  return fresh;
}

module.exports = { SITE, AD_HOSTS, earlyRedactScript, hideScript, setupSite, setupPlainSite, checkDeploy };

if (require.main === module && process.argv.includes('--check')) checkDeploy().then((ok) => process.exit(ok ? 0 : 2));
