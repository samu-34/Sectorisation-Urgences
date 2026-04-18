/**
 * MediMap — analytics.js
 * Active Cloudflare Web Analytics via token de configuration dans index.html.
 */

(function setupCloudflareWebAnalytics() {
  const tokenMeta = document.querySelector('meta[name="cloudflare-analytics-token"]');
  const token = String(tokenMeta?.getAttribute("content") || "").trim();

  if (!token) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute(
    "data-cf-beacon",
    JSON.stringify({
      token,
    }),
  );
  document.head.appendChild(script);
})();
