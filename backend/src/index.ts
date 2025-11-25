import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Database } from './database';
import { DatabaseConfig } from './struct';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

// ➕ (NUEVO) Se importan las rutas del Módulo 6
import evaluacionesRoutes from "./routes/evaluaciones";
import estadisticasRoutes from "./routes/estadisticas";
import badgesRoutes from "./routes/badges";

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// 🔄 ➕ Se centraliza la configuración de la BD (reutilizable por otros módulos)
export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

// 🔁 ✔ ÚNICA instancia global de la base de datos
const database = new Database(dbConfig);

// 🔁 ➕ Se guarda la instancia en Express para que cualquier ruta pueda acceder a ella
app.set("db", database);

interface Lead {
  name: string;
  institution: string;
  contactPhone: string;
  phone: string;
  password: string;
}

// Middlewares generales
app.use(cors());
app.use(express.json());

// 🔗 ➕ Se registran RUTAS del Módulo 6
app.use("/api/evaluaciones", evaluacionesRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/badges", badgesRoutes);

// Endpoint de prueba
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ⚙️ Rutas originales de LEADS (NO SE MODIFICAN)
app.post('/api/verify-code', async (req: Request, res: Response) => {
  try {
    const { idLead, codeEscritoPorElUsuario } = req.body;

    if (!idLead || !codeEscritoPorElUsuario) {
      return res.status(400).json({ status: 'error', message: 'Faltan parámetros' });
    }

    const result = await database.query(`
      SELECT code 
      FROM "codeLead"
      WHERE "idLead" = $1
      ORDER BY id DESC
      LIMIT 1;
    `, [idLead]);

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No se encontró código' });
    }

    const esCorrecto = result.rows[0].code === codeEscritoPorElUsuario;

    res.status(200).json({
      status: 'ok',
      match: esCorrecto,
      message: esCorrecto ? 'Código correcto' : 'Código incorrecto'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.post('/api/send-code', async (req: Request, res: Response) => {
  try {
    const { name, institution, contactPhone, phone, password } = req.body as Lead;

    if (!name || !institution || !contactPhone || !phone || !password) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await database.query(`
      INSERT INTO lead (name, institution, "contactPhone", phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [name, institution, contactPhone, phone]);

    await database.query(`
      INSERT INTO "leadPassword" ("idLead", "password")
      VALUES ($1, $2)
    `, [result.rows[0].id, hashedPassword]);

    const code = Math.floor(10000 + Math.random() * 89999) + '';

    await database.query(`
      INSERT INTO "codeLead" ("idLead", code)
      VALUES ($1, $2)
    `, [result.rows[0].id, code]);

    res.status(200).json({
      status: 'ok',
      message: 'Code sent successfully',
      leadId: result.rows[0].id,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// 🚀 Conexión a la base de datos y arranque del servidor
async function startServer() {
  try {
    await database.connect();
    console.log('🔥 Base de datos conectada');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error conectando BD:', error);
    process.exit(1);
  }
}

startServer();
