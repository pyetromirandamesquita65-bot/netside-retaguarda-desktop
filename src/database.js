const path = require("path");
const Database = require("better-sqlite3");
const { app } = require("electron");

let connection;

const tableMap = {
  clients: {
    table: "clients",
    fields: ["code", "name", "document", "phone", "address"],
    order: "code ASC"
  },
  products: {
    table: "products",
    fields: ["code", "barcode", "name", "description", "price", "cost", "unit", "stock", "category"],
    order: "name ASC"
  },
  employees: {
    table: "employees",
    fields: ["code", "name", "document", "phone", "role", "username", "password"],
    order: "name ASC"
  },
  orders: {
    table: "orders",
    fields: ["number", "client", "total", "discount", "status", "created_at"],
    order: "id DESC"
  },
  service_orders: {
    table: "service_orders",
    fields: ["number", "client", "technician", "status", "total", "description", "notes", "created_at"],
    order: "id DESC"
  },
  quotes: {
    table: "quotes",
    fields: ["number", "client", "total", "discount", "notes", "created_at"],
    order: "id DESC"
  },
  presales: {
    table: "presales",
    fields: ["number", "client", "total", "status", "created_at"],
    order: "id DESC"
  },
  entries: {
    table: "entries",
    fields: ["supplier", "document", "product", "quantity", "cost", "created_at"],
    order: "id DESC"
  },
  cash_movements: {
    table: "cash_movements",
    fields: ["type", "description", "amount", "created_at"],
    order: "id DESC"
  }
};

function init() {
  connection = new Database(path.join(app.getPath("userData"), "netside-retaguarda.sqlite"));
  connection.pragma("journal_mode = WAL");
  connection.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL,
      document TEXT, phone TEXT, address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, barcode TEXT, name TEXT NOT NULL,
      description TEXT, price REAL DEFAULT 0, cost REAL DEFAULT 0, unit TEXT DEFAULT 'UN',
      stock REAL DEFAULT 0, category TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL,
      document TEXT, phone TEXT, role TEXT, username TEXT, password TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, client TEXT, total REAL DEFAULT 0,
      discount REAL DEFAULT 0, status TEXT DEFAULT 'ABERTO', payment_method TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_code TEXT, product_name TEXT,
      quantity REAL, price REAL, subtotal REAL
    );
    CREATE TABLE IF NOT EXISTS service_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, client TEXT, technician TEXT,
      status TEXT DEFAULT 'ABERTA', total REAL DEFAULT 0, description TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, client TEXT, total REAL DEFAULT 0,
      discount REAL DEFAULT 0, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS presales (
      id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT UNIQUE, client TEXT, total REAL DEFAULT 0,
      status TEXT DEFAULT 'ABERTA', created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, supplier TEXT, document TEXT, product TEXT,
      quantity REAL DEFAULT 0, cost REAL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cash_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, description TEXT, amount REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  seed();
}

function seed() {
  const clientCount = connection.prepare("SELECT COUNT(*) count FROM clients").get().count;
  if (!clientCount) {
    const insert = connection.prepare("INSERT INTO clients (code,name,document,phone,address) VALUES (?,?,?,?,?)");
    insert.run("0001", "Consumidor final", "", "(00) 0000-0000", "Balcão");
    insert.run("0002", "Oficina Central Ltda.", "12.345.678/0001-90", "(11) 4002-8922", "Av. Brasil, 1200");
    insert.run("0003", "Maria de Souza", "123.456.789-00", "(11) 99999-1111", "Rua das Flores, 55");
  }
  const employeeCount = connection.prepare("SELECT COUNT(*) count FROM employees").get().count;
  if (!employeeCount) {
    connection.prepare("INSERT INTO employees (code,name,document,phone,role,username,password) VALUES (?,?,?,?,?,?,?)")
      .run("001", "Administrador", "000.000.000-00", "", "Administrador", "admin", "admin");
    connection.prepare("INSERT INTO employees (code,name,role,username,password) VALUES (?,?,?,?,?)")
      .run("002", "Carlos Técnico", "Técnico", "carlos", "1234");
  }
  const cashCount = connection.prepare("SELECT COUNT(*) count FROM cash_movements").get().count;
  if (!cashCount) {
    connection.prepare("INSERT INTO cash_movements (type,description,amount) VALUES (?,?,?)")
      .run("ABERTURA", "Abertura do caixa", 500);
  }
}

function list(key, search = "") {
  const config = tableMap[key];
  if (!config) return [];
  const value = String(search || "").trim();
  const where = value ? `WHERE ${config.fields.map((field) => `${field} LIKE @search`).join(" OR ")}` : "";
  return connection.prepare(`SELECT * FROM ${config.table} ${where} ORDER BY ${config.order}`).all({ search: `%${value}%` });
}

function save(key, record) {
  const config = tableMap[key];
  if (!config) throw new Error(`Tabela desconhecida: ${key}`);
  const values = config.fields.map((field) => record[field] ?? "");
  if (record.id) {
    const assignments = config.fields.map((field) => `${field} = ?`).join(", ");
    connection.prepare(`UPDATE ${config.table} SET ${assignments} WHERE id = ?`).run(...values, record.id);
    return { ...record };
  }
  const placeholders = config.fields.map(() => "?").join(", ");
  const result = connection.prepare(`INSERT INTO ${config.table} (${config.fields.join(", ")}) VALUES (${placeholders})`).run(...values);
  return { id: result.lastInsertRowid, ...record };
}

function remove(key, id) {
  const config = tableMap[key];
  if (!config) throw new Error(`Tabela desconhecida: ${key}`);
  connection.prepare(`DELETE FROM ${config.table} WHERE id = ?`).run(id);
  return true;
}

function dashboard() {
  return {
    products: connection.prepare("SELECT COUNT(*) count FROM products").get().count,
    clients: connection.prepare("SELECT COUNT(*) count FROM clients").get().count,
    orders: connection.prepare("SELECT COUNT(*) count FROM orders").get().count,
    openOrders: connection.prepare("SELECT COUNT(*) count FROM orders WHERE status <> 'FINALIZADO'").get().count,
    cash: connection.prepare("SELECT COALESCE(SUM(CASE WHEN type IN ('ABERTURA','ENTRADA','VENDA') THEN amount ELSE -amount END),0) total FROM cash_movements").get().total
  };
}

function nextNumber(table, prefix) {
  const row = connection.prepare(`SELECT COUNT(*) count FROM ${table}`).get();
  return `${prefix}-${String(row.count + 1).padStart(5, "0")}`;
}

function finalizeOrder(order) {
  const number = order.number || nextNumber("orders", "PED");
  const transaction = connection.transaction(() => {
    const orderResult = save("orders", {
      number,
      client: order.client || "Consumidor final",
      total: Number(order.total || 0),
      discount: Number(order.discount || 0),
      status: "FINALIZADO",
      payment_method: order.paymentMethod || "NÃO INFORMADO",
      created_at: new Date().toISOString()
    });
    const insertItem = connection.prepare("INSERT INTO order_items (order_id,product_code,product_name,quantity,price,subtotal) VALUES (?,?,?,?,?,?)");
    (order.items || []).forEach((item) => insertItem.run(orderResult.id, item.code, item.name, Number(item.quantity), Number(item.price), Number(item.quantity) * Number(item.price)));
    connection.prepare("INSERT INTO cash_movements (type,description,amount) VALUES (?,?,?)").run("VENDA", `Venda ${number}`, Number(order.total || 0));
    return { ...orderResult, number };
  });
  return transaction();
}

module.exports = { init, list, save, remove, dashboard, finalizeOrder };