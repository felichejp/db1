// backend/src/transaction.ts
import * as dotenv from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";
import * as readline from "readline";

// Cargar variables de entorno desde ../.env
dotenv.config({ path: resolve(__dirname, "../.env") });

// Helper para leer variables obligatorias
function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`Falta variable de entorno: ${name}`);
}

// Config de conexión
const pool = new Pool({
  host: env("PGHOST"),
  port: Number(process.env.PGPORT ?? 5432),
  database: env("PGDATABASE"),
  user: env("PGUSER"),
  password: env("PGPASSWORD"),
  ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : undefined,
});

// Utilidad para pedir datos por consola
function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function guardarLead() {
  console.log("Conectando a PostgreSQL…");

  // Pedir datos
  const lead = await ask("Introduce el Lead (nombre): ");
  const password = await ask("Introduce el Password: ");
  const codigo = await ask("Introduce el Código: ");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Validar código (tabla 'codigos')
    const sel = await client.query("SELECT 1 FROM codigos WHERE code = $1 FOR UPDATE", [codigo]);
    const valido = (sel.rowCount ?? 0) > 0;
    console.log(valido ? "✅ Código válido" : "❌ Código inválido");
    if (!valido) throw new Error("El código no existe o no es válido.");

    // 2) Insertar lead (ajusta el nombre de tabla/columnas a tu esquema real)
    const insLead = await client.query(
      "INSERT INTO lead (name) VALUES ($1) RETURNING id",
      [lead]
    );
    const leadId: number = insLead.rows[0].id;

    // 3) Guardar password (demo: texto plano; idealmente usar hash)
    await client.query(
      "INSERT INTO lead_password (lead_id, password) VALUES ($1, $2)",
      [leadId, password]
    );

    await client.query("COMMIT");
    console.log("✅ Transacción completada correctamente");
  } catch (err) {
    // Revertir usando el MISMO client
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Transacción revertida:", msg);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar
guardarLead();
