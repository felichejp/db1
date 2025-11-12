// backend/src/index.ts

// --- 1. IMPORTACIONES ---
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// --- 2. CONFIGURACIÓN INICIAL ---
dotenv.config();
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- 3. CONEXIÓN A LA BASE DE DATOS ---
const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false },
});

// --- 4. FUNCIÓN PARA EL "CÓDIGO DEL LEAD" ---
function generateLeadCode(): string {
  const code = Math.floor(10000 + Math.random() * 90000);
  return code.toString();
}

// --- 5. EL ENDPOINT (LA TAREA) ---
app.post('/api/leads', async (req: Request, res: Response) => {
  console.log('Recibido en /api/leads:', req.body);
  
  const { name, institution, contactPhone, phone, password } = req.body;

  if (!password || !name || !institution || !phone) {
    return res.status(400).json({ error: 'Faltan datos obligatorios (name, institution, phone, password)' });
  }

  const client = await pool.connect();
  console.log('Cliente de BD conectado');

  try {
    // ---- ¡AQUÍ EMPIEZA LA TAREA! ----

    // TAREA 1: PASSWORD
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password hasheado:', hashedPassword);

    // TAREA 2: CÓDIGO
    const leadCode = generateLeadCode();
    console.log('Código de lead generado:', leadCode);

    // TAREA 3: LA TRANSACCIÓN
    await client.query('BEGIN');
    console.log('Transacción iniciada');

    // Paso 1: Insertar en la tabla `lead`
    const leadQuery = `
      INSERT INTO lead (name, institution, "contactPhone", phone) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id
    `;
    const leadValues = [name, institution, contactPhone, phone];
    const leadResult = await client.query(leadQuery, leadValues);
    const newLeadId = leadResult.rows[0].id;
    console.log('Lead creado en tabla "lead" con ID:', newLeadId);

    // Paso 2: Insertar en la tabla `leadPassword`
    // <-- ¡CAMBIO AQUÍ! (Comillas en "leadPassword")
    const passwordQuery = `
      INSERT INTO "leadPassword" ("idLead", password) 
      VALUES ($1, $2)
    `;
    const passwordValues = [newLeadId, hashedPassword];
    await client.query(passwordQuery, passwordValues);
    console.log('Password guardado en tabla "leadPassword"');

    // Paso 3: Insertar en la tabla `codeLead`
    // <-- ¡CAMBIO AQUÍ! (Comillas en "codeLead")
    const codeQuery = `
      INSERT INTO "codeLead" ("idLead", code) 
      VALUES ($1, $2)
    `;
    const codeValues = [newLeadId, leadCode];
    await client.query(codeQuery, codeValues);
    console.log('Código guardado en tabla "codeLead"');

    
    await client.query('COMMIT');
    console.log('Transacción completada (COMMIT)');

    // d. Enviamos la respuesta
    res.status(201).json({ 
      message: 'Lead creado con éxito', 
      leadId: newLeadId,
      code: leadCode
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en la transacción, haciendo ROLLBACK', error);
    res.status(500).json({ error: 'Error al crear el lead' });
  } finally {
    client.release();
    console.log('Cliente de BD liberado');
  }
});

// --- 6. INICIAMOS EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});