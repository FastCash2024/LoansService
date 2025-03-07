import express from 'express'
import {asignationCases} from '../controllers/asignationController.js'
const router = express.Router();

router.get('/filters', asignationCases);

export default router;
