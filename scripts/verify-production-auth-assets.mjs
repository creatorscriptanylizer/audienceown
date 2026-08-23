const baseUrl = new URL(process.env.PRODUCTION_ASSET_BASE_URL ?? "https://audienceown.com");
const pagePath = process.env.PRODUCTION_ASSET_PAGE_PATH ?? "/register?mode=signup";

async function checkedFetch(url, expectedType) {
  const response = await fetch(url, { redirect: "manual", headers: { "user-agent": "AudienceOwn production asset verifier" } });
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (response.status !== 200) throw new Error(`${url.pathname} returned HTTP ${response.status}`);
  if (!contentType.toLowerCase().startsWith(expectedType)) throw new Error(`${url.pathname} returned ${contentType || "no Content-Type"}; expected ${expectedType}`);
  if (!body.length) throw new Error(`${url.pathname} returned an empty response`);
  return body;
}

const pageUrl = new URL(pagePath, baseUrl);
const html = await checkedFetch(pageUrl, "text/html");
const stylesheetPaths = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(match => match[1]);
const scriptPaths = [...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map(match => match[1]);

if (!stylesheetPaths.length) throw new Error(`${pageUrl.pathname} emitted no stylesheet links`);
if (!scriptPaths.length) throw new Error(`${pageUrl.pathname} emitted no JavaScript chunks`);

const cssBodies = await Promise.all(stylesheetPaths.map(path => checkedFetch(new URL(path, baseUrl), "text/css")));
await Promise.all(scriptPaths.map(path => checkedFetch(new URL(path, baseUrl), "application/javascript")));

const combinedCss = cssBodies.join("\n");
for (const selector of [".onboarding-shell", ".onboarding-progress", ".recovery-pass-grid"]) {
  if (!combinedCss.includes(selector)) throw new Error(`Production CSS is missing ${selector}`);
}

console.info(JSON.stringify({
  status: "ok",
  page: pageUrl.href,
  stylesheets: stylesheetPaths.length,
  scripts: scriptPaths.length,
  onboardingSelectors: "present",
}));
