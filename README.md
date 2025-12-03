# Bot de WhatsApp - El Manicero

Bot conversacional inteligente para ventas automatizadas de productos a traves de WhatsApp, con procesamiento de lenguaje natural y gestion de pedidos integrada.

## Descripcion

Bot de WhatsApp Business desarrollado con Node.js que permite a los clientes navegar productos, hacer consultas en lenguaje natural, crear pedidos y recibir atencion automatizada 24/7. Forma parte del ecosistema "El Manicero", integrando con un backend FastAPI para la gestion completa del e-commerce.

## Tecnologias Principales

- **Node.js** con Express.js - Runtime y framework web
- **Meta WhatsApp Business Cloud API** - Integracion oficial de WhatsApp
- **Mistral AI** - Deteccion inteligente de productos mediante IA
- **node-nlp** - Procesamiento de lenguaje natural (NLP)
- **Axios** - Cliente HTTP para integracion con backend
- **dotenv** - Gestion de variables de entorno

## Caracteristicas

- **Atencion automatizada 24/7** mediante conversaciones inteligentes
- **Deteccion de productos con IA** usando Mistral AI para interpretar nombres en lenguaje natural
- **Procesamiento de lenguaje natural (NLP)** para reconocer saludos, despedidas y preguntas frecuentes
- **Gestion de estados de conversacion** para mantener el contexto de cada usuario
- **Creacion automatizada de pedidos** con validacion y confirmacion
- **Integracion con backend FastAPI** para sincronizacion de productos, inventario y pedidos
- **Manejo de carrito de compras** con calculo de totales y gestion de cantidades
- **Respuestas personalizadas** segun el estado de la conversacion
- **Sistema de sesiones** para tracking de usuarios
- **Webhooks de Meta** con verificacion de seguridad

## Estructura del Proyecto

```
bot-wsp-manicero/
├── index.js                    # Punto de entrada de la aplicacion
├── package.json                # Dependencias y scripts
├── .env.example                # Plantilla de variables de entorno
│
├── src/
│   ├── config/                 # Configuracion de servicios externos
│   │   └── meta.js            # Configuracion de Meta API
│   │
│   ├── controllers/            # Logica de orquestacion
│   │   ├── flowController.js          # Control de flujos de conversacion
│   │   ├── messageController.js       # Procesamiento de mensajes
│   │   └── webhookController.js       # Manejo de webhooks de Meta
│   │
│   ├── flows/                  # Flujos de conversacion
│   │   ├── flujoBienvenida.js         # Flujo de bienvenida inicial
│   │   ├── menuFlow.js                # Navegacion del menu principal
│   │   ├── orderFlow.js               # Proceso de creacion de pedidos
│   │   └── productSearchFlow.js       # Busqueda de productos
│   │
│   ├── services/               # Logica de negocio y servicios externos
│   │   ├── apiService.js              # Cliente del backend FastAPI
│   │   ├── cartService.js             # Gestion del carrito de compras
│   │   ├── conversationStateService.js # Estados de conversacion
│   │   ├── messageService.js          # Envio de mensajes de WhatsApp
│   │   ├── mistralService.js          # Integracion con Mistral AI
│   │   ├── nlpService.js              # Procesamiento NLP
│   │   ├── productFormatterService.js # Formato de productos para mensajes
│   │   ├── productService.js          # Logica de productos
│   │   ├── sessionService.js          # Gestion de sesiones de usuario
│   │   └── staticDataService.js       # Carga de datos JSON locales
│   │
│   ├── utils/                  # Utilidades y detectores
│   │   ├── faqDetector.js             # Deteccion de preguntas frecuentes
│   │   ├── farewellDetector.js        # Deteccion de despedidas
│   │   └── greetingDetector.js        # Deteccion de saludos
│   │
│   ├── data/                   # Almacenamiento local temporal (JSON)
│   │   ├── productos.json             # Cache de productos
│   │   ├── pedidos.json               # Pedidos temporales
│   │   ├── usuarios.json              # Usuarios registrados
│   │   └── pagos.json                 # Registros de pago
│   │
│   └── routes/                 # Definicion de endpoints
│       └── webhook.js                 # Rutas del webhook de Meta
```

## Variables de Entorno

Crea un archivo `.env` en la raiz del proyecto con las siguientes variables:

```env
# Meta WhatsApp Business API Configuration
# Obtener en: https://developers.facebook.com/apps
VERIFY_TOKEN=tu_token_de_verificacion
ACCESS_TOKEN=tu_access_token_de_meta
PHONE_NUMBER_ID=tu_phone_number_id

# Mistral AI Configuration
# Obtener en: https://console.mistral.ai/
MISTRAL_API_KEY=tu_mistral_api_key

# Backend FastAPI Configuration
API_BASE_URL=http://localhost:8000
API_TIMEOUT=5000
```

### Como Obtener las Credenciales

1. **Meta WhatsApp Business API**:
   - Accede a [Meta for Developers](https://developers.facebook.com/apps)
   - Crea una aplicacion de tipo "Business"
   - Configura WhatsApp Business API
   - Obtén `ACCESS_TOKEN` y `PHONE_NUMBER_ID` del dashboard
   - Define tu propio `VERIFY_TOKEN` (puede ser cualquier string)

2. **Mistral AI**:
   - Registrate en [Mistral AI Console](https://console.mistral.ai/)
   - Genera una API Key en tu panel de control
   - Copia la key a `MISTRAL_API_KEY`

3. **Backend API**:
   - Asegurate de tener el backend FastAPI (`api-manicero-lucas`) ejecutandose
   - Por defecto usa `http://localhost:8000`
   - En produccion, cambia a tu URL de backend

## Instalacion

### Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Meta Business con WhatsApp Business API configurado
- API Key de Mistral AI
- Backend FastAPI ejecutandose (api-manicero-lucas)

### Pasos de Instalacion

1. **Clonar el repositorio** (si aplica):
```bash
git clone <url-del-repositorio>
cd bot-wsp-manicero
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
```

4. **Verificar conexion con el backend**:
```bash
# Asegurate de que el backend este corriendo en http://localhost:8000
# Puedes verificarlo accediendo a http://localhost:8000/docs
```

## Como Ejecutar

### Modo Desarrollo (con auto-reload)

```bash
npm start
```

El bot se iniciara en el puerto **3000** con nodemon para recarga automatica.

### Modo Produccion

```bash
node index.js
```

### Configuracion del Webhook de Meta

1. Accede al panel de Meta for Developers
2. Ve a tu aplicacion > WhatsApp > Configuration
3. En "Webhook", haz clic en "Edit"
4. Configura:
   - **Callback URL**: `https://tu-dominio.com/webhook` (o usa ngrok para desarrollo local)
   - **Verify Token**: El mismo valor que pusiste en `VERIFY_TOKEN`
5. Suscribete a los eventos:
   - `messages`
   - `message_status` (opcional)

### Desarrollo Local con ngrok

Para probar el webhook localmente:

```bash
# Instala ngrok: https://ngrok.com/download
ngrok http 3000

# Usa la URL https generada como Callback URL en Meta
# Ejemplo: https://abc123.ngrok.io/webhook
```

## Flujos Principales

### 1. Flujo de Bienvenida (`flujoBienvenida.js`)
- Detecta saludos del usuario
- Presenta el bot y opciones principales
- Redirige al menu principal

### 2. Flujo del Menu Principal (`menuFlow.js`)
- Muestra opciones de navegacion:
  - Ver productos
  - Buscar productos
  - Ver carrito
  - Hacer pedido
  - Ayuda / FAQ
- Maneja la seleccion del usuario

### 3. Flujo de Busqueda de Productos (`productSearchFlow.js`)
- Recibe consultas en lenguaje natural del usuario
- Usa Mistral AI para detectar el producto mencionado
- Muestra productos disponibles con precios
- Permite agregar productos al carrito

### 4. Flujo de Creacion de Pedidos (`orderFlow.js`)
- Muestra resumen del carrito
- Solicita datos de entrega (direccion, metodo de pago)
- Valida informacion
- Crea el pedido en el backend
- Confirma con numero de pedido

## Integracion con Otros Componentes

### Backend FastAPI (api-manicero-lucas)

El bot se comunica con el backend para:

- **Obtener productos**: `GET /api/productos`
- **Crear pedidos**: `POST /api/pedidos`
- **Consultar inventario**: `GET /api/productos/{id}`
- **Registrar usuarios**: `POST /api/usuarios`
- **Actualizar estado de pedidos**: `PUT /api/pedidos/{id}`

#### Ejemplo de Flujo de Integracion

```
Usuario → Bot WhatsApp → Backend FastAPI → PostgreSQL (Supabase)
                ↓                ↓
         Mistral AI    →    Validacion
                              ↓
                        Respuesta al usuario
```

### Servicios de IA

1. **Mistral AI** (`mistralService.js`):
   - Interpreta mensajes de usuarios
   - Extrae nombres de productos
   - Sugerencias inteligentes

2. **node-nlp** (`nlpService.js`):
   - Clasificacion de intenciones
   - Deteccion de saludos/despedidas
   - Respuestas a FAQs

## API Endpoints

### Webhook de Meta

#### `GET /webhook`
Verificacion inicial del webhook por parte de Meta.

**Query params**:
- `hub.mode`: "subscribe"
- `hub.verify_token`: Tu VERIFY_TOKEN
- `hub.challenge`: Codigo de verificacion

**Respuesta**: Retorna `hub.challenge` si el token es valido.

#### `POST /webhook`
Recibe eventos de mensajes de WhatsApp.

**Body**: Payload de Meta con estructura de mensaje
**Respuesta**: `200 OK` (procesamiento asincrono)

## Logs y Debugging

El bot incluye logging en consola para:

- Mensajes entrantes y salientes
- Estados de conversacion
- Llamadas al backend
- Errores y excepciones
- Respuestas de IA

Ejemplo de logs:
```
🚀 Webhook en puerto 3000
📩 Mensaje recibido de 51912345678: "Quiero comprar mani"
🤖 Mistral AI detectó producto: Mani tostado clasico
✅ Producto agregado al carrito
📤 Respuesta enviada
```

## Manejo de Errores

El bot implementa manejo robusto de errores:

- **Errores de conexion con Meta API**: Reintentos automaticos
- **Backend no disponible**: Mensaje amigable al usuario
- **Mistral AI falla**: Fallback a NLP local
- **JSON invalido**: Respuesta 400 con mensaje claro
- **Timeouts**: Configurables via `API_TIMEOUT`

## Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'Agregar nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## Roadmap

- [ ] Soporte para imagenes de productos
- [ ] Integracion con pasarelas de pago (Stripe, MercadoPago)
- [ ] Notificaciones de estado de pedido
- [ ] Panel de administracion de conversaciones
- [ ] Metricas y analytics de conversaciones
- [ ] Soporte multiidioma
- [ ] Tests automatizados (Jest/Mocha)

## Licencia

ISC

## Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio.

---

**Desarrollado como parte del sistema El Manicero - E-commerce multi-canal**
