import mongoose from 'mongoose';

const ContactosSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String
});
const SmsSchema = new mongoose.Schema({
  sender: String,
  body: String,
});
const AcotacionSchema = new mongoose.Schema({
  acotacion: String,
  cuenta: String,
  asesor: String,
  emailAsesor: String,
  fecha: String,
});
const TrackingDeOperacionesSchema = new mongoose.Schema({
  operacion: String,
  modificacion: String,
  fecha: String,

  cuenta: String,
  asesor: String,
  emailAsesor: String,
});

const HistorialAsesorSchema = new mongoose.Schema({
  nombreAsesor: String,
  cuentaOperativa: String,
  cuentaPersonal: String,
  fecha: String
});

const StdDispersionSchema = new mongoose.Schema({
  success: Boolean,
  descripcionError: String,
  id: Number,
  fechaOperacion: Number,
  institucionOperante: Number,
  claveRastreo: String,
  claveRastreoDevolucion: String,
  empresa: String,
  monto: Number,
  digitoIdentificadorBeneficiario: Number,
  medioEntrega: String,
  firma: String
}, { _id: false });


const HistorialTramitacionDeCasos = new mongoose.Schema({
  subID: String, // Caso
  numeroDePrestamo: String,
  idDeSubFactura: String,
  estadoDeCredito: String,
  nombreDelCliente: String,
  numeroDeTelefonoMovil: String,
  clienteNuevo: String,
  valorSolicitado: Number,
  valorEnviado: Number,

  valorPrestamoMenosInteres: Number,
  valorExtencion: Number,
  icon: String,

  numeroDeCuenta: String,
  nombreBanco: String,
  dni: String,

  registroDeNotas: String,
  nombreDelProducto: String,
  fechaDeReembolso: String, // Cuando el cliente pago la deuda 
  fechaDeCreacionDeLaTarea: String, // cuando el caso se manda a solicitud
  fechaDeTramitacionDelCaso: String, // fecha de asignacion del caso
  nombreDeLaEmpresa: String,
  cantidadDispersada: String,
  fechaDeDispersion: String,
  fechaDeReembolsoEstimado: String,
  // Datos capturados del caso
  contactos: [ContactosSchema],
  sms: [SmsSchema],

  // Usuario de verificación asignado
  apodoDeUsuarioDeVerificacion: String,
  cuentaVerificador: String,

  // Usuario de cobro asignado
  apodoDeUsuarioDeCobro: String,
  cuentaCobrador: String,

  // Usuario de auditoría asignado
  apodoDeUsuarioDeAuditoria: String,
  cuentaAuditor: String,

  // Asesor actual asignado
  asesor: String,
  emailAsesor: String,
  estadoDeComunicacion: String, // Para reporte de Casos de cobranza
  fechaRegistroComunicacion: String, // Para reporte de Casos de cobranza
  fechaDeTramitacionDeCobro: String,
  valorLiquidacion: Number,
  claveBanco: Number,
  acotacionesCobrador: [AcotacionSchema],
  acotaciones: [AcotacionSchema],
  trackingDeOperaciones: [TrackingDeOperacionesSchema],
  // cuentasBancarias: [CuentasBancariasSchema],
  stdDispersion: StdDispersionSchema,
  historialDeAsesores: [HistorialAsesorSchema],
  // stpOrdenDePago: StdDispersionSchema
  cuentaClaveParaCobro: String,
  stpOrdenDeDispersion: Object
}, { _id: false });



const verificationCollectionSchema = new mongoose.Schema({
  // ----------DATOS DE TABLA --------Recolección y Validación de Datos
  // Datos enviados del celu
  numeroDePrestamo: String,
  idDeSubFactura: String,
  estadoDeCredito: String,
  nombreDelCliente: String,
  numeroDeTelefonoMovil: String,
  clienteNuevo: String,
  valorSolicitado: Number,
  valorEnviado: Number,

  valorPrestamoMenosInteres: Number,
  valorExtencion: Number,
  icon: String,

  numeroDeCuenta: String,
  nombreBanco: String,

  registroDeNotas: String,
  nombreDelProducto: String,
  fechaDeReembolso: String, // Cuando el cliente pago la deuda 
  fechaDeCreacionDeLaTarea: String, // cuando el caso se manda a solicitud
  fechaDeTramitacionDelCaso: String, // fecha de asignacion del caso
  nombreDeLaEmpresa: String,
  cantidadDispersada: String,
  fechaDeDispersion: String,
  tipoCuenta: String,
  rfcCurp: String,
  // Datos capturados del caso
  contactos: [ContactosSchema],
  sms: [SmsSchema],

  // Usuario de verificación asignado
  apodoDeUsuarioDeVerificacion: String,
  cuentaVerificador: String,

  // Usuario de cobro asignado
  apodoDeUsuarioDeCobro: String,
  cuentaCobrador: String,

  // Usuario de auditoría asignado
  apodoDeUsuarioDeAuditoria: String,
  cuentaAuditor: String,

  // Asesor actual asignado
  asesor: String,
  emailAsesor: String,
  estadoDeComunicacion: String, // Para reporte de Casos de cobranza
  fechaRegistroComunicacion: String, // Para reporte de Casos de cobranza
  fechaDeTramitacionDeCobro: String,
  fechaDeCobro: String,
  valorLiquidacion: Number,
  claveBanco: Number,
  acotacionesCobrador: [AcotacionSchema],
  acotaciones: [AcotacionSchema],
  trackingDeOperaciones: [TrackingDeOperacionesSchema],
  // cuentasBancarias: [CuentasBancariasSchema],
  stdDispersion: StdDispersionSchema,
  historialDeAsesores: [HistorialAsesorSchema],
  // stpOrdenDePago: StdDispersionSchema
  cuentaClabeParaCobro: String,
  stpOrdenDeDispersion: Object
}, {
  timestamps: true,
  collection: 'recoleccionYValidacionDeDatos'
});

export default mongoose.model('VerificationCollection', verificationCollectionSchema);
