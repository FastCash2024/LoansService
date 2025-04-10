import express from 'express';
<<<<<<< HEAD

import { createCredit, getAllCredits, getCreditById, getCreditByPhone, updateCredit, deleteCredit, getCustomerFlow, getUpdateSTP, getForUpdateSTP, updateCreditoAprobado, reporteComision, getSegmentedCases, getAllCreditsOrderByDate } from '../controllers/verificationController.js';
import { getReporteCDiario, getReporteCDiarioTotales, getReporteDiario, getReporteDiarioTotales, getReporteTotales } from '../controllers/reportsController.js';

=======
import { createCredit, getAllCredits, getCreditById, getCreditByPhone, updateCredit, deleteCredit, getCustomerFlow, getUpdateSTP, getForUpdateSTP, updateCreditoAprobado, reporteComision } from '../controllers/verificationController.js';
import { getReporteCDiario, getReporteCDiarioTotales, getReporteDiario, getReporteTotales, getReporteDiarioTotales } from '../controllers/reportsController.js';
>>>>>>> 0f541656e0a85b43da07b274d6fbaebd322bc8db

const router = express.Router();

router.post('/add', createCredit);
router.get('/', getAllCredits);
router.get('/getall', getAllCreditsOrderByDate);
router.get('/resumecases', getSegmentedCases);
router.get('/reportetotales', getReporteTotales);
router.get('/reporte', getReporteDiario);
router.get('/reportecobrados', getReporteCDiario);
router.get('/customer', getCustomerFlow);
router.get('/phone', getCreditByPhone);
router.get('/reportcomision', reporteComision);
router.get('/totalreporteverificacion', getReporteDiarioTotales);
router.get('/totalreportecobro', getReporteCDiarioTotales);
router.get('/:id', getCreditById);
router.get('/updateSTP/:idDeSubFactura', getUpdateSTP);
router.get('/getForUpdateSTP/:cuentaClabeParaCobro', getForUpdateSTP);
router.put('/:id', updateCredit);
router.put('/creditoaprobado/:id', updateCreditoAprobado);
router.delete('/:id', deleteCredit);

export default router;
