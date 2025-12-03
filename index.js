import express from "express";
import bodyParser from "body-parser";
import webhookRoutes from "./src/routes/webhook.js";
import notificationRoutes from "./src/routes/notification.js";

const app = express();

// Configurar body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔹 Configurar rutas
app.use('/', webhookRoutes);
app.use('/', notificationRoutes);

// 🔹 Manejo de errores 404 (Ruta no encontrada)
app.use((req, res, next) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Ruta no encontrada" });
});

// 🔹 Manejo de errores globales (incluyendo JSON inválido)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('❌ JSON inválido recibido:', err.message);
    return res.status(400).json({ error: "JSON inválido" });
  }
  console.error('❌ Error interno del servidor:', err);
  res.status(500).json({ error: "Error interno del servidor" });
});

// 🔹 Iniciar servidor
app.listen(3000, () => console.log("🚀 Webhook en puerto 3000"));
