import express from 'express';
import cron from 'node-cron';
import { asignationCasesVerification, assignCasesBySegment } from '../controllers/asignationController.js';

const router = express.Router();

router.get("/asignar-casos-verificacion", asignationCasesVerification);
router.get('/assign-cases-cobranza', assignCasesBySegment);

export default router;
