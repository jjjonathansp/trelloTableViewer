import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("trello_table.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    control_card_id TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_data (
    card_id TEXT NOT NULL,
    column_id INTEGER NOT NULL,
    value TEXT,
    PRIMARY KEY (card_id, column_id),
    FOREIGN KEY (column_id) REFERENCES custom_columns(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/auth/trello/callback", (req, res) => {
    res.send(`
      <html>
        <body>
          <script>
            const hash = window.location.hash;
            if (hash && hash.includes("token=")) {
              const token = hash.split("token=")[1];
              if (window.opener) {
                window.opener.postMessage({ type: "TRELLO_AUTH_SUCCESS", token }, "*");
                window.close();
              }
            }
          </script>
          <p>Authenticating... This window will close automatically.</p>
        </body>
      </html>
    `);
  });

  // API Routes
  app.get("/api/columns/:controlCardId", (req, res) => {
    const { controlCardId } = req.params;
    const columns = db.prepare("SELECT * FROM custom_columns WHERE control_card_id = ?").all(controlCardId);
    res.json(columns);
  });

  app.post("/api/columns", (req, res) => {
    const { controlCardId, name } = req.body;
    const info = db.prepare("INSERT INTO custom_columns (control_card_id, name) VALUES (?, ?)").run(controlCardId, name);
    res.json({ id: info.lastInsertRowid, controlCardId, name });
  });

  app.delete("/api/columns/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM custom_columns WHERE id = ?").run(id);
    db.prepare("DELETE FROM custom_data WHERE column_id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/data/:controlCardId", (req, res) => {
    const { controlCardId } = req.params;
    // Get all data for cards associated with this control card's columns
    const data = db.prepare(`
      SELECT d.* FROM custom_data d
      JOIN custom_columns c ON d.column_id = c.id
      WHERE c.control_card_id = ?
    `).all(controlCardId);
    res.json(data);
  });

  app.post("/api/data", (req, res) => {
    const { cardId, columnId, value } = req.body;
    db.prepare(`
      INSERT INTO custom_data (card_id, column_id, value)
      VALUES (?, ?, ?)
      ON CONFLICT(card_id, column_id) DO UPDATE SET value = excluded.value
    `).run(cardId, columnId, value);
    res.json({ success: true });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
