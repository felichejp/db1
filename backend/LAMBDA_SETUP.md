# Configuración de AWS Lambda

Esta guía explica cómo configurar el backend para ejecutarse en AWS Lambda.

## ⚠️ Limitaciones

- **Socket.IO NO funciona en Lambda**: Lambda no soporta conexiones WebSocket persistentes. Solo las rutas HTTP/API funcionarán.
- Para funcionalidad en tiempo real, considera usar:
  - API Gateway WebSocket API
  - AWS AppSync
  - Un servicio separado para Socket.IO (EC2, ECS, etc.)

## Configuración de la Función Lambda

### 1. Crear la Función Lambda

```bash
aws lambda create-function \
  --function-name peer-tutoring-backend \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler lambda-handler.handler \
  --timeout 60 \
  --memory-size 1024 \
  --zip-file fileb://lambda-deployment.zip
```

### 2. Configurar Variables de Entorno

En la consola de AWS Lambda, configura estas variables de entorno:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=tu-clave-secreta-minimo-32-caracteres
DB_HOST=tu-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=peer_tutoring_db
DB_USER=postgres
DB_PASSWORD=tu-password
CORS_ORIGIN=https://tu-frontend-domain.com
AWS_REGION=us-east-1
```

### 3. Configurar VPC (si la base de datos está en VPC)

Si tu base de datos PostgreSQL está en una VPC privada:

1. Ve a Configuration > VPC
2. Selecciona la VPC, subnets y security groups apropiados
3. Asegúrate de que el security group permita conexiones a PostgreSQL (puerto 5432)

### 4. Configurar API Gateway

Para exponer la función Lambda a través de HTTP:

1. Crea un API Gateway REST API o HTTP API
2. Crea una integración Lambda
3. Configura las rutas (ej: `/{proxy+}` para todas las rutas)
4. Despliega el API

**Ejemplo con AWS CLI:**

```bash
# Crear API
aws apigatewayv2 create-api \
  --name peer-tutoring-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,PUT,DELETE,OPTIONS",AllowHeaders="*"

# Crear integración Lambda
aws apigatewayv2 create-integration \
  --api-id YOUR_API_ID \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:REGION:ACCOUNT:function:peer-tutoring-backend

# Crear ruta
aws apigatewayv2 create-route \
  --api-id YOUR_API_ID \
  --route-key "$default" \
  --target integrations/YOUR_INTEGRATION_ID
```

## Configuración Recomendada

- **Runtime**: Node.js 20.x
- **Handler**: `lambda-handler.handler`
- **Timeout**: 60 segundos (mínimo recomendado)
- **Memory**: 1024 MB (mínimo recomendado para PostgreSQL)
- **Environment Variables**: Todas las variables necesarias para la conexión a BD
- **VPC**: Si la BD está en VPC privada
- **Layers**: Opcional - PostgreSQL client libraries si es necesario

## Despliegue Automático

El workflow de CI/CD (`cicd-backend.yaml`) se activa con tags `v-backend*`:

```bash
git tag v-backend-1.0.0
git push origin v-backend-1.0.0
```

## Testing Local

Para probar el handler Lambda localmente:

```bash
# Instalar dependencias
npm install

# Compilar
npm run build

# Probar con serverless-offline o SAM Local
npm install -g serverless
serverless invoke local -f handler
```

## Troubleshooting

### Error: "Cannot find module 'serverless-http'"
- Asegúrate de que `npm install` se ejecutó correctamente
- Verifica que `serverless-http` esté en `package.json`

### Error: "Connection timeout" a PostgreSQL
- Verifica que Lambda esté en la misma VPC que RDS
- Verifica security groups
- Verifica que el timeout de Lambda sea suficiente

### Socket.IO no funciona
- Esto es esperado. Lambda no soporta WebSockets
- Considera usar API Gateway WebSocket API o un servicio separado

## Archivos Relacionados

- `lambda-handler.ts` - Handler principal para Lambda
- `server.ts` - Aplicación Express (modificada para detectar Lambda)
- `.github/workflows/cicd-backend.yaml` - Workflow de CI/CD

