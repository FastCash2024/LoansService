import express from 'express';
<<<<<<< HEAD
import { createCredit, getAllCredits, getCreditById, getCreditByPhone, updateCredit, deleteCredit, getCustomerFlow, getUpdateSTP, updateCreditoAprobado, reporteComision } from '../controllers/verificationController.js';
import { getReporteCDiario, getReporteCDiarioTotales, getReporteDiario, getReporteDiarioTotales, getReporteTotales } from '../controllers/reportsController.js';
=======
import { createCredit, getAllCredits, getCreditById, getCreditByPhone, updateCredit, deleteCredit, getCustomerFlow, getUpdateSTP, getForUpdateSTP, updateCreditoAprobado, reporteComision } from '../controllers/verificationController.js';
import { getReporteCDiario, getReporteCDiarioTotales, getReporteDiario, getReporteDiarioTotales } from '../controllers/reportsController.js';
>>>>>>> 51e1ba35d4e40b73e120789692246c8670561630

const router = express.Router();

router.post('/add', createCredit);
router.get('/', getAllCredits);
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
