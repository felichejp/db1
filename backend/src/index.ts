import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Database } from './database';
import { DatabaseConfig } from './struct';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

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

    console.log(`🔍 Verifying code for lead ID: ${idLead}`);
    console.log(`📝 User entered code: ${codeEscritoPorElUsuario}`);

    // Validar que los campos requeridos estén presentes
    if (!idLead || !codeEscritoPorElUsuario) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: idLead and codeEscritoPorElUsuario',
      });
    }

    // Consultar el código en la base de datos en la tabla codeLead
    const query = `
      SELECT code FROM "codeLead" 
      WHERE "idLead" = $1 
      ORDER BY id DESC 
      LIMIT 1
    `;
    console.log(`📊 Querying database for lead ${idLead}...`);
    const result = await database.query(query, [idLead]);

    // Verificar si se encontró algún código para el lead
    if (result.rows.length === 0) {
      console.log(`❌ No code found in database for lead ${idLead}`);
      return res.status(404).json({
        status: 'error',
        message: 'No code found for this lead',
        verified: false
      });
    }

    const codigoEnBaseDeDatos = result.rows[0].code;
    console.log(`📋 Code from database: ${codigoEnBaseDeDatos}`);

    // Comparar con el código escrito por el usuario
    const esValido = codigoEnBaseDeDatos === codeEscritoPorElUsuario;
    
    console.log(`✅ Code comparison result: ${esValido ? 'VALID' : 'INVALID'}`);
    console.log(`📊 Verification ${esValido ? 'SUCCESSFUL' : 'FAILED'} for lead ${idLead}`);

    // Regresar true o false
    res.status(200).json({
      status: 'ok',
      message: esValido ? 'Code verified successfully' : 'Invalid code',
      verified: esValido
    });

  } catch (error) {
    console.error('❌ Error processing verify-code request:', error);
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
    
    // Iniciar transacción
    await database.query('BEGIN');
    
    try {
      // 1. Insertar nuevo lead
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
      const leadId = result.rows[0].id;

      // 2. Insertar password del lead
      const insertPasswordQuery = `
        INSERT INTO "leadPassword" ("idLead", "password")
        VALUES ($1, $2)
        RETURNING id;
      `;
      const resultPassword = await database.query(insertPasswordQuery, [leadId, hashedPassword]);

      // 3. Insertar código del lead
      const insertCodeLeadQuery = `
        INSERT INTO "codeLead" ("idLead", code)
        VALUES ($1, $2)
        RETURNING id;
      `;
      const code = Math.floor(10000 + Math.random() * 89999) + '';
      const resultCode = await database.query(insertCodeLeadQuery, [leadId, code]);

      // Validar que todas las inserciones fueron exitosas
      if (resultPassword.rows.length === 0 || resultCode.rows.length === 0) {
        await database.query('ROLLBACK');
        return res.status(500).json({
          status: 'error',
          message: 'Failed to save password or code',
        });
      }

      // Confirmar transacción
      await database.query('COMMIT');
      
      console.log('✅ Lead saved to database (transaction committed):', { leadId, code });
      
      // TODO: enviar el WA
      res.status(200).json({
        status: 'ok',
        message: 'Code sent successfully',
        leadId: leadId,
      });
      
    } catch (transactionError) {
      // Revertir transacción en caso de error
      await database.query('ROLLBACK');
      console.error('❌ Transaction rolled back due to error:', transactionError);
      throw transactionError; // Re-lanzar para que el catch externo lo maneje
    }
    
  } catch (error) {
    console.error('❌ Error processing request:', error);
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
