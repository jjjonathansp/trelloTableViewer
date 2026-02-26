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
      },
      "attachment-thumbnail": function () {
        console.log("[TTM Power-Up] attachment-thumbnail requested (compat mode)");
        return null;
      },
      "card-from-url": function () {
        console.log("[TTM Power-Up] card-from-url requested (compat mode)");
        return null;
      },
      "format-url": function () {
        console.log("[TTM Power-Up] format-url requested (compat mode)");
        return null;
      },
      "list-actions": function () {
        console.log("[TTM Power-Up] list-actions requested (compat mode)");
        return [];
      },
      "list-sorters": function () {
        console.log("[TTM Power-Up] list-sorters requested (compat mode)");
        return [];
      },
      "on-disable": function () {
        console.log("[TTM Power-Up] on-disable called (compat mode)");
      },
      "authorization-status": function () {
        console.log("[TTM Power-Up] authorization-status requested (compat mode)");
        return { authorized: true };
      },
      "show-authorization": function () {
        console.log("[TTM Power-Up] show-authorization requested (compat mode)");
        return {
          type: "iframe",
          url: "./?mode=powerup&debug=1",
          height: 520
        };
      },
      "save-attachment": function () {
        console.log("[TTM Power-Up] save-attachment requested (compat mode)");
        return null;
      },
      "remove-data": function () {
        console.log("[TTM Power-Up] remove-data requested (compat mode)");
        return null;
      }
    });

    console.log("[TTM Power-Up] connector initialized");
  } catch (error) {
    console.error("[TTM Power-Up] initialize failed", error);
  }
}

initPowerUpConnector(0);
