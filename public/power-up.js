window.TrelloPowerUp.initialize({
  "card-back-section": function (t) {
    return {
      title: "Tabla de tarjetas",
      icon: {
        dark: "https://trello.com/favicon.ico",
        light: "https://trello.com/favicon.ico"
      },
      content: {
        type: "iframe",
        url: t.signUrl("./?mode=powerup"),
        height: 520
      }
    };
  }
});
