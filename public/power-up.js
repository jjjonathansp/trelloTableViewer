console.log("[TTM Power-Up] connector loaded", {
  href: window.location.href,
  timestamp: new Date().toISOString()
});

window.addEventListener("error", function (event) {
  console.error("[TTM Power-Up] connector error", event.message, event.filename, event.lineno);
});

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
  }
});
