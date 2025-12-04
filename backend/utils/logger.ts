import winston from 'winston';
import fs from 'fs';
import path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const isLambda = !!process.env.LAMBDA_TASK_ROOT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Crear directorio de logs solo si no estamos en Lambda y el directorio no existe
const logsDir = path.join(process.cwd(), 'logs');
if (!isLambda && !fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    // Si no se puede crear, continuar sin archivos de log
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console()
];

// Solo agregar archivos de log si no estamos en Lambda y el directorio existe
if (!isLambda && fs.existsSync(logsDir)) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    })
  );
}

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) =>
            `${timestamp} [${level}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`
        )
      )
    : winston.format.json(),
  transports
});

export default logger;


