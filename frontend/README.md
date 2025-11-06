# Asesoría Estudiantil - Frontend

## Descripción
Frontend para la aplicación de asesoría estudiantil desarrollado con Node.js y HTML puro, implementando una SPA con tema oscuro.

## Características Implementadas

### ✅ Página de Inicio
- Menú lateral deslizable
- Presentación de la aplicación
- Motivos para utilizar la plataforma
- Diseño con tema oscuro
- Botones de llamada a la acción

### ✅ Página de Autenticación/Registro
- Formulario completo con todos los campos requeridos:
  - Nombre del contacto
  - Nombre de la institución
  - Teléfono de contacto
  - Teléfono móvil con WhatsApp
  - Contraseña con validación robusta
- Sistema de verificación por código de 5 dígitos
- Botón de reenvío con contador de 1 minuto
- Validaciones en tiempo real

### ✅ Funcionalidades Técnicas
- Aplicación SPA (Single Page Application)
- Navegación sin recarga de página
- Tema oscuro completo
- Diseño responsive
- Integración con backend via API
- Validación de formularios
- Manejo de errores

## Instalación y Uso

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm

### Instalación
```bash
cd frontend
npm install
```

### Ejecución
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## Configuración del Backend

El frontend está configurado para comunicarse con un backend en `http://localhost:8000` por defecto. Puedes cambiar esto configurando la variable de entorno:

```bash
BACKEND_URL=http://tu-backend-url:puerto
```

## Estructura del Proyecto

```
frontend/
├── package.json          # Dependencias y scripts
├── server.js             # Servidor Express
├── public/
│   ├── index.html        # Página principal
│   ├── styles.css        # Estilos con tema oscuro
│   └── script.js         # Lógica JavaScript
└── README.md             # Este archivo
```

## API Endpoints

El servidor frontend actúa como proxy para las siguientes rutas:

- `POST /api/send-code` - Envía código de verificación por WhatsApp
- `POST /api/verify-code` - Verifica el código y registra el usuario

## Características del Diseño

- **Tema oscuro**: Gradientes azules y grises oscuros
- **Responsive**: Adaptable a móviles y tablets
- **Animaciones**: Transiciones suaves y efectos hover
- **Iconografía**: Font Awesome para iconos
- **Tipografía**: Segoe UI para mejor legibilidad

## Validaciones Implementadas

### Contraseña
- Mínimo 8 caracteres
- Debe contener letras
- Debe contener números
- Debe contener caracteres especiales

### Teléfono
- Formato válido de número telefónico
- Validación de longitud mínima

### Campos Requeridos
- Todos los campos del formulario son obligatorios
- Validación en tiempo real

## Próximos Pasos

Esta es la primera parte del proyecto. Las siguientes funcionalidades se implementarán en futuras iteraciones según el prompt original.
