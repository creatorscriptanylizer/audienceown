const baseUrlValue = process.argv[2];
const secret = process.env.RENDER_MULTIPART_PROOF_SECRET;

if (!baseUrlValue || !secret) {
  console.error("Usage: RENDER_MULTIPART_PROOF_SECRET=<secret> node scripts/render-compatibility-proof.mjs https://<service>.onrender.com");
  process.exit(2);
}

const baseUrl = new URL(baseUrlValue);
const loopback = baseUrl.hostname === "127.0.0.1" || baseUrl.hostname === "localhost";
if ((!loopback && baseUrl.protocol !== "https:") || baseUrl.hostname === "audienceown.com" || baseUrl.hostname.endsWith(".audienceown.com")) {
  console.error("The proof runner requires an HTTPS disposable hostname and refuses AudienceOwn production hostnames.");
  process.exit(2);
}

const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function png(size) {
  const bytes = new Uint8Array(size);
  bytes.set(pngHeader);
  return new Blob([bytes], { type: "image/png" });
}

async function request(path, init) {
  const started = performance.now();
  const response = await fetch(new URL(path, baseUrl), { redirect: "manual", ...init });
  return { response, durationMs: Math.round(performance.now() - started) };
}

async function checkRoute(path, expected) {
  const { response, durationMs } = await request(path);
  const passed = expected.includes(response.status);
  console.log(JSON.stringify({ check: path, status: response.status, durationMs, passed, location: response.headers.get("location") }));
  return passed;
}

async function checkMultipart(label, sizes, expectedStatus) {
  const form = new FormData();
  sizes.forEach((size, index) => form.append("attachments", png(size), `proof-${index + 1}.png`));
  const { response, durationMs } = await request("/api/internal/render-proof/multipart", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
    body: form,
  });
  const body = await response.json().catch(() => null);
  const reachedApplication = response.headers.get("x-audienceown-proof-reached") === "application";
  const passed = response.status === expectedStatus && reachedApplication;
  console.log(JSON.stringify({ check: label, status: response.status, durationMs, reachedApplication, body, passed }));
  return passed;
}

const mb = 1024 * 1024;
const results = await Promise.all([
  checkRoute("/", [200]),
  checkRoute("/contact", [200]),
  checkRoute("/privacy", [200]),
  checkRoute("/manifest.webmanifest", [200]),
  checkRoute("/api/health", [200]),
  checkRoute("/render-proof-unknown-creator", [404]),
  checkRoute("/dashboard", [307, 308]),
]);

results.push(await checkMultipart("multipart-1mb", [1 * mb], 200));
results.push(await checkMultipart("multipart-5mb", [5 * mb], 200));
results.push(await checkMultipart("multipart-10mb", [5 * mb, 5 * mb], 200));
results.push(await checkMultipart("multipart-above-envelope", [5 * mb, 5 * mb, 600 * 1024], 413));

if (results.some(result => !result)) process.exitCode = 1;
