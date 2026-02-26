const CONNECTOR_VERSION = "v2026-02-26-compat-attachment";

console.log("[TTM Power-Up] connector loaded", {
  version: CONNECTOR_VERSION,
  href: window.location.href,
  timestamp: new Date().toISOString()
});

window.addEventListener("error", function (event) {
  console.error("[TTM Power-Up] connector error", event.message, event.filename, event.lineno);
});

function initPowerUpConnector(attempts) {
  if (!window.TrelloPowerUp || typeof window.TrelloPowerUp.initialize !== "function") {
    if (attempts > 20) {
      console.error("[TTM Power-Up] TrelloPowerUp client not available after retries");
      return;
    }

    setTimeout(function () {
      initPowerUpConnector(attempts + 1);
    }, 100);
    return;
  }

  try {
    window.TrelloPowerUp.initialize({
      "card-back-section": function (t) {
        console.log("[TTM Power-Up] card-back-section requested");

        return {
          title: "Tabla de tarjetas",
          icon: {
            dark: "https://trello.com/favicon.ico",
            light: "https://trello.com/favicon.ico"
          },
          content: {
            type: "iframe",
            url: t.signUrl("./?mode=powerup&debug=1"),
            height: 520
          }
        };
      },
      "attachment-sections": function () {
        console.log("[TTM Power-Up] attachment-sections requested (compat mode)");
        return [];
      }
    });

    console.log("[TTM Power-Up] connector initialized");
  } catch (error) {
    console.error("[TTM Power-Up] initialize failed", error);
  }
}

initPowerUpConnector(0);
