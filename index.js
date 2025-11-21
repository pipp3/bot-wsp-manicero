import express from "express";
import bodyParser from "body-parser";
import webhookRoutes from "./src/routes/webhook.js";

const app = express();
app.use(bodyParser.json());

// 🔹 Configurar rutas
app.use('/', webhookRoutes);

// 🔹 Iniciar servidor
app.listen(3000, () => console.log("🚀 Webhook en puerto 3000"));
