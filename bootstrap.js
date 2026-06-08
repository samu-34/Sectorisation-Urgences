(function bootstrapMediMap() {
  const SCRIPTS_IN_ORDER = [
    "generated/sectorization-data.js?v=1780914800078089014",
    "data.js?v=20260506-2100",
    "generated/montpellier_street_index.js?v=20260324-1621",
    "domain.js?v=20260319-1735",
    "application.js?v=20260319-1735",
    "autocomplete.js?v=20260319-1735",
    "city-input-controller.js?v=20260324-1915",
    "map-renderer-static.js?v=20260506-1920",
    "map-renderer-layout.js?v=20260324-2015",
    "vendor/leaflet/leaflet.js?v=20260319-1735",
    "map-renderer.js?v=20260324-2015",
    "app.js?v=20260418-1055",
    "analytics.js?v=20260418-1115",
  ];

  async function fetchAuthStatus() {
    const response = await fetch("/auth/status", {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("auth_status_failed");
    }

    return response.json();
  }

  async function login(password) {
    const response = await fetch("/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ password }),
    });

    return response.ok;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("script_load_failed:" + src));
      document.body.appendChild(script);
    });
  }

  async function loadAllScripts() {
    for (const src of SCRIPTS_IN_ORDER) {
      await loadScript(src);
    }
  }

  function getAuthDom() {
    return {
      overlay: document.getElementById("authOverlay"),
      form: document.getElementById("authForm"),
      passwordInput: document.getElementById("authPassword"),
      error: document.getElementById("authError"),
      toggleBtn: document.getElementById("authTogglePasswordBtn"),
    };
  }

  function openAuthOverlay(authDom) {
    if (!authDom.overlay) return;
    authDom.overlay.classList.remove("hidden");
    authDom.error?.classList.add("hidden");
    if (authDom.passwordInput) {
      authDom.passwordInput.value = "";
      authDom.passwordInput.type = "password";
      authDom.passwordInput.focus();
    }
    if (authDom.toggleBtn) {
      authDom.toggleBtn.textContent = "Afficher";
      authDom.toggleBtn.setAttribute("aria-pressed", "false");
    }
  }

  function wirePasswordToggle(authDom) {
    if (!authDom.toggleBtn || !authDom.passwordInput) return;
    authDom.toggleBtn.addEventListener("click", () => {
      const shouldReveal = authDom.passwordInput.type === "password";
      authDom.passwordInput.type = shouldReveal ? "text" : "password";
      authDom.toggleBtn.textContent = shouldReveal ? "Masquer" : "Afficher";
      authDom.toggleBtn.setAttribute("aria-pressed", shouldReveal ? "true" : "false");
    });
  }

  async function requireLogin() {
    const authDom = getAuthDom();
    wirePasswordToggle(authDom);
    openAuthOverlay(authDom);

    if (!authDom.form || !authDom.passwordInput) {
      throw new Error("auth_dom_missing");
    }

    return new Promise((resolve) => {
      authDom.form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const password = String(authDom.passwordInput.value || "").trim();
        const ok = await login(password);
        if (!ok) {
          authDom.error?.classList.remove("hidden");
          authDom.passwordInput.select();
          return;
        }
        authDom.overlay?.classList.add("hidden");
        resolve();
      });

      authDom.passwordInput.addEventListener("input", () => {
        authDom.error?.classList.add("hidden");
      });
    });
  }

  async function start() {
    try {
      const status = await fetchAuthStatus();
      if (status.enabled && !status.authenticated) {
        await requireLogin();
      }
      await loadAllScripts();
    } catch (error) {
      console.error("Bootstrap error", error);
      const authError = document.getElementById("authError");
      if (authError) {
        authError.textContent =
          "Erreur de chargement de la securite. Verifier le serveur puis recharger.";
        authError.classList.remove("hidden");
      }
    }
  }

  void start();
})();
