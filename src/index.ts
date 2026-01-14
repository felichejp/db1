// index.ts
import * as dotenv from "dotenv";
import { resolve } from "path";
import { Pool } from "pg";
import * as readline from "readline";

// Cargar variables de entorno desde el .env en la raíz
dotenv.config({ path: resolve(__dirname, "../.env") });

console.log("ENV PGHOST =", process.env.PGHOST || "(no definido)");

// Crear interfaz para capturar datos desde consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  // Configuración del pool (conexión a la base de datos)
  const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl:
      process.env.PGSSLMODE === "require"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  console.log("\nConectando a PostgreSQL…");

  try {
    const client = await pool.connect();
    console.log("✅ Conectado correctamente como:", process.env.PGUSER);

    // Solicitar datos al usuario
    rl.question("Introduce el Lead: ", (lead) => {
      rl.question("Introduce el Password: ", (password) => {
        rl.question("Introduce el Código: ", async (codigo) => {
          console.log("\nGuardando datos...");

          try {
            // Validar el código en la base de datos
            const sel = await client.query(
              "SELECT * FROM codigos WHERE codigo = $1",
              [codigo]
            );

            console.log(
              sel.rowCount && sel.rowCount > 0
                ? "✅ Código válido"
                : "❌ Código inválido"
            );
          } catch (err: any) {
            if (err.code === "42501") {
              console.error("⚠️ Permiso denegado: usuario sin privilegios de escritura.");
            } else {
              console.error("❌ Error al consultar:", err.message);
            }
          } finally {
            client.release();
            rl.close();
          }
        });
      });
    });
  } catch (error: any) {
    console.error("Error general:", error.code || error);
  }
}

main();
