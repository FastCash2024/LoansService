import express from 'express'; 
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from  'body-parser';
import twilio from 'twilio';
import path from 'path';
import { fileURLToPath } from 'url'; // Asegúrate de importar fileURLToPath

import connectDB from './config/db.js';

import verificationRoutes from './api/routes/verificationRoutes.js';
import accessRoutes from './api/routes/accessRoutes.js';
import counterRoutes from './api/routes/counterRoutes.js';
import clabesRoutes from './api/routes/clabesRoutes.js';

import { errorHandler } from './api/middleware/errorHandler.js';

dotenv.config();
const app = express();
app.use(bodyParser.json());


app.use(cors());
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Conectar a MongoDB
connectDB();

app.use(express.json({ limit: '100mb' })); // Ajusta el límite según el tamaño de las solicitudes esperadas
app.use(express.urlencoded({ limit: '100mb', extended: true }));
// Rutas

app.use('/api/verification', verificationRoutes); // CasesDB ---> manejador de casos
app.use('/api/users', accessRoutes); // CasesDB ---> distribuidor de casos RENOMBRAR

app.use('/api/counter', counterRoutes); // CasesDB ---> contador de numerosDeCaso
//Contador de clabes routes
app.use('/api/clabes', clabesRoutes); // CasesDB ---> distribuidor de casos RENOMBRAR

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware de manejo de errores
app.use(errorHandler);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

                  







