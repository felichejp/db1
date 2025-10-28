import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8000;


interface Lead {
    name: string,
    institution:string,
    contactPhone: string,
    phone: string,
    password: string
}

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


app.post('/api/send-code', (req: Request, res: Response) => {
  const { name, institution, contactPhone, phone, password } = req.body as Lead;
  // almacenar en base de datos
  // enviar el WA
  console.log(req.body);

  res.status(200).json({
    status: 'ok',
    message: 'Code sent successfully'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
