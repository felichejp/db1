# Backend Server

A simple TypeScript backend server using Express and Axios.

## Features

- ✅ TypeScript support
- ✅ Express.js framework
- ✅ Axios for HTTP requests
- ✅ Health check endpoint
- ✅ JSON parsing middleware
- ✅ CORS enabled
- ✅ Error handling

## Installation

```bash
npm install
```

## Development

Run in development mode with hot reload:

```bash
npm run dev
```

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

## Production

Start the production server:

```bash
npm start
```

## API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Receive JSON Data

```bash
POST /api/data
Content-Type: application/json

{
  "key": "value",
  "number": 123
}
```

Response:
```json
{
  "success": true,
  "message": "Data received successfully",
  "receivedData": {
    "key": "value",
    "number": 123
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Receive JSON Data with Resource Parameter

```bash
POST /api/data/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Data received for resource: users",
  "resource": "users",
  "receivedData": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Example Usage with cURL

### Health Check
```bash
curl http://localhost:3000/health
```

### Send JSON Data
```bash
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "age": 30}'
```

### Send JSON Data with Resource
```bash
curl -X POST http://localhost:3000/api/data/products \
  -H "Content-Type: campsion/json" \
  -d '{"name": "Product", "price": 99.99}'
```

## Environment Variables

The server runs on port 3000 by default. You can change it by setting the `PORT` environment variable:

```bash
PORT=4000 npm run dev
```

## Project Structure

```
backend/
├── src/
│   └── index.ts          # Main server file
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```






