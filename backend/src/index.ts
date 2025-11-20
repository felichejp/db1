import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Database } from './database';
import { DatabaseConfig } from './struct';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

//modulo 6
import evaluacionesRoutes from "./routes/evaluaciones";
import estadisticasRoutes from "./routes/estadisticas";
import badgesRoutes from "./routes/badges";


const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// Database configuration from environment variables
const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
};

// Initialize database instance
const database = new Database(dbConfig);

interface Lead {
  name: string;
  institution: string;
  contactPhone: string;
  phone: string;
  password: string;
}

// Middleware
app.use(cors());
app.use(express.json());

//modulo 6

app.use("/api/evaluaciones", evaluacionesRoutes);
app.use("/api/estadisticas", estadisticasRoutes);
app.use("/api/badges", badgesRoutes);


// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.post('/api/verify-code', async (req: Request, res: Response) => {
  try {
    const { idLead, codeEscritoPorElUsuario } = req.body;

    if (!idLead || !codeEscritoPorElUsuario) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan parámetros: idLead o codeEscritoPorElUsuario'
      });
    }

    // 1. LEER el código almacenado en la BD
    const selectQuery = `
      SELECT code 
      FROM "codeLead"
      WHERE "idLead" = $1
      ORDER BY id DESC
      LIMIT 1;
    `;

    const result = await database.query(selectQuery, [idLead]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontró un código para ese lead'
      });
    }

    const codigoBD = result.rows[0].code;

    // 2. COMPARAR ambos códigos
    const esCorrecto = codigoBD === codeEscritoPorElUsuario;

    return res.status(200).json({
      status: 'ok',
      match: esCorrecto,
      message: esCorrecto ? 'Código correcto' : 'Código incorrecto'
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/send-code', async (req: Request, res: Response) => {
  try {
    const { name, institution, contactPhone, phone, password } = req.body as Lead;
    
    // Validate required fields
    if (!name || !institution || !contactPhone || !phone || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields',
      });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    // Store in database
    const insertQuery = `
      INSERT INTO lead (name, institution, "contactPhone", phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const result = await database.query(insertQuery, [
      name,
      institution,
      contactPhone,
      phone
    ]);
    const insertPasswordQuery = `
      INSERT INTO "leadPassword" ("idLead", "password")
      VALUES ($1, $2)
      RETURNING id;
    `;
    const resultPassword = await database.query(insertPasswordQuery, [result.rows[0].id, hashedPassword]);

    const insertCodeLeadQuery = `
      INSERT INTO "codeLead" ("idLead", code)
      VALUES ($1, $2)
      RETURNING id;
    `;
    const code = Math.floor(10000 + Math.random() * 89999) + '';
    const resultCode = await database.query(insertCodeLeadQuery, [result.rows[0].id, code]);

    if (resultPassword.rows.length === 0 || resultCode.rows.length === 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to save password or code',
      });
    }
    console.log('Lead saved to database:', result.rows[0]);

    // TODO: enviar el WA
    res.status(200).json({
      status: 'ok',
      message: 'Code sent successfully',
      leadId: result.rows[0].id,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Connect to database and start server
async function startServer() {
  try {
    await database.connect();
    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await database.disconnect();
  console.log('✅ Database disconnected');
  process.exit(0);
});

startServer();
