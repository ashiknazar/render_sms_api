const express = require("express");
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create the table on startup if it doesn't exist
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_activation (
      user_id VARCHAR(100) PRIMARY KEY,
      contact VARCHAR(50) NOT NULL,
      message TEXT,
      time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Health check: open the URL in a browser to confirm it's running
app.get("/", (req, res) => res.send("SMS service is running"));

// The Android app calls this
app.post("/sms", async (req, res) => {
  if (req.get("x-api-key") !== process.env.API_KEY) {
    return res.sendStatus(401);
  }

  const { contact, message } = req.body;
  if (!contact) return res.status(400).send("contact is required");

  try {
    await pool.query(
      "INSERT INTO user_activation (user_id, contact, message) VALUES ($1, $2, $3)",
      [randomUUID(), String(contact).slice(0, 50), message ?? null]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const port = process.env.PORT || 3000;

initDb()
  .then(() => app.listen(port, () => console.log(`Listening on ${port}`)))
  .catch((err) => {
    console.error("DB init failed:", err);
    process.exit(1);
  });