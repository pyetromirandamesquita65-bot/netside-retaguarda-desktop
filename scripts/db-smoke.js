const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const file = path.join(__dirname, "smoke.sqlite");
try { fs.rmSync(file, { force: true }); } catch {}
const db = new Database(file);
db.exec("CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, price REAL)");
db.prepare("INSERT INTO products (code,name,price) VALUES (?,?,?)").run("TEST-001", "Produto de teste", 12.5);
const row = db.prepare("SELECT * FROM products WHERE code = ?").get("TEST-001");
if (!row || row.name !== "Produto de teste") throw new Error("SQLite smoke test failed");
db.close();
fs.rmSync(file, { force: true });
console.log("SQLite persistence smoke test passed.");