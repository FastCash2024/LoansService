import moment from 'moment';
import VerificationCollection from '../models/VerificationCollection.js';
import { VerificationCollectionBackup } from '../models/verificationCollectionBackupSchema.js'; '../models/verificationCollectionBackupSchema.js';
import { formatFechaYYYYMMDD } from '../utilities/currentWeek.js';
import { aplicarFiltroFecha } from '../utilities/filters.js';
import { calculateDateRangeForWeek, calculateDynamicDateRange } from '../utilities/filtersCustomer.js';

function generarSecuencia(count) {
  let base = 15 + Math.floor(Math.floor(count / 999999)) * 1;
  let numero = count <= 999999 ? count + 1 : 1;
  // Funcion que genera el número en el formato deseado
  const secuencia = `${base}${String(numero).padStart(6, '0')}`;
  return secuencia;
}

// Crear un nuevo credito
export const createCredit = async (req, res) => {
  const count = await VerificationCollection.countDocuments();
  const generador = generarSecuencia(count);
  try {
    const newData = {
      ...req.body,
      numeroDePrestamo: generador
    }
    const newCredit = new VerificationCollection(newData);
    const savedCredit = await newCredit.save();
    res.status(201).json(savedCredit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener todos los créditos
export const getAllCredits = async (req, res) => {
  try {
    const {
      cuentaVerificador,
      cuentaCobrador,
      cuentaAuditor,
      numeroDePrestamo,
      idDeSubFactura,
      estadoDeCredito,
      nombreDelCliente,
      numeroDeTelefonoMovil,
      clientesNuevo,
      nombreDelProducto,
      fechaDeReembolso,
      fechaDeDispersion,
      fechaDeCobro,
      fechaDeCreacionDeLaTarea,
      fechaDeTramitacionDelCaso,
      fechaDeTramitacionDeCobro,
      limit = 5,
      page = 1
    } = req.query;

    // Construcción dinámica del filtro
    const filter = {};
    if (cuentaVerificador) {
      filter.cuentaVerificador = { $regex: cuentaVerificador, $options: "i" };
    }
    if (cuentaCobrador) {
      filter.cuentaCobrador = { $regex: cuentaCobrador, $options: "i" };
    }
    if (cuentaAuditor) {
      filter.cuentaAuditor = { $regex: cuentaAuditor, $options: "i" };
    }
    if (numeroDePrestamo) {
      filter.numeroDePrestamo = { $regex: numeroDePrestamo, $options: "i" };
    }
    if (idDeSubFactura) {
      filter.idDeSubFactura = { $regex: idDeSubFactura, $options: "i" };
    }

    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map(palabra => palabra.trim());
      filter.estadoDeCredito = palabras;
    }

    if (nombreDelCliente) {
      filter.nombreDelCliente = { $regex: nombreDelCliente, $options: "i" };
    }
    if (numeroDeTelefonoMovil) {
      filter.numeroDeTelefonoMovil = { $regex: numeroDeTelefonoMovil, $options: "i" };
    }
    if (clientesNuevo) {
      filter.clientesNuevo = clientesNuevo === "true"; // Convertir a booleano
    }
    if (nombreDelProducto) {
      filter.nombreDelProducto = { $regex: nombreDelProducto, $options: "i" };
    }

    aplicarFiltroFecha(filter, "fechaDeCreacionDeLaTarea", fechaDeCreacionDeLaTarea);
    aplicarFiltroFecha(filter, "fechaDeTramitacionDelCaso", fechaDeTramitacionDelCaso);
    aplicarFiltroFecha(filter, "fechaDeTramitacionDeCobro", fechaDeTramitacionDeCobro);
    aplicarFiltroFecha(filter, "fechaDeCobro", fechaDeCobro);
    aplicarFiltroFecha(filter, "fechaDeReembolso", fechaDeReembolso);
    aplicarFiltroFecha(filter, "fechaDeDispersion", fechaDeDispersion);

    // obtener el total de documentos
    const totalDocuments = await VerificationCollection.countDocuments(filter);

    // calcular el total de pagianas
    const totalPages = Math.ceil(totalDocuments / limit);
    // Consulta a MongoDB con filtro
    const credits = await VerificationCollection.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    console.log("creditos: ", credits);

    res.json({
      data: credits,
      currentPage: parseInt(page),
      totalPages,
      totalDocuments,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los créditos.", error: error.message });
  }
};


// Obtener un crédito por ID
export const getCreditById = async (req, res) => {
  try {
    const credit = await VerificationCollection.findById(req.params.id);
    if (!credit) return res.status(404).json({ message: 'Crédito no encontrado' });
    res.json(credit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un crédito por número de teléfono
export const getCreditByPhone = async (req, res) => {
  try {
    const numeroDeTelefonoMovil = req.query.numeroDeTelefonoMovil;

    if (!numeroDeTelefonoMovil) return res.status(404).json({ message: 'Número de teléfono no proporcionado' });

    // Filtrar por número de teléfono
    const filter = {
      numeroDeTelefonoMovil: { $regex: numeroDeTelefonoMovil, $options: "i" } // Se busca en el campo correcto
    };

    // Buscar el crédito que coincida con el número de teléfono
    const response = await VerificationCollection.find(filter);

    if (!response || response.length === 0) {
      return res.status(404).json({ message: 'Crédito no encontrado' });
    }

    res.json(response);
  } catch (error) {
    console.error("Error al obtener crédito por número de teléfono:", error);
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un crédito
export const updateCredit = async (req, res) => {
  try {
    const updatedCredit = await VerificationCollection.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedCredit) return res.status(404).json({ message: 'Crédito no encontrado' });
    res.json(updatedCredit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const enviarSolicitudAprobacion = async (credit) => {
  const url = "https://stp.fastcash-mx.com/api/registar-orden-pago";

  const dataEnviar = {
    _id: credit._id.toString(),
    nombreDelCliente: credit.nombreDelCliente,
    numeroDeCuenta: credit.numeroDeCuenta,
    valorEnviar: credit.valorEnviar,
    claveBanco: credit.claveBanco,
    tipoCuenta: credit.tipoCuenta === "Tarjeta de debito" ? 3 : 40,
    rfcCurp: credit?.rfcCurp ? credit?.rfcCurp:"ND",
  };


  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataEnviar),
    });

    const data = await response.json();

    if (!data || data.success === null || data.error) {
      return {
        success: false,
        message: "La dispersión no se realizó. Intente nuevamente.",
        error: data?.error || "Error desconocido",
      };
    }

    return {
      success: true,
      ...data
    };
  } catch (error) {
    return {
      success: false,
      message: "Error en la solicitud de aprobación.",
      error: error.message,
    };
  }
};


export const updateCreditoAprobado = async (req, res) => {
  try {

    const { estadoDeCredito, ...trackingData } = req.body;

    const updatedCredit = await VerificationCollection.findByIdAndUpdate(
      req.params.id,
      { $set: { estadoDeCredito: req.body.estadoDeCredito } },
      { new: true }
    );

    if (!updatedCredit) {
      return res.status(404).json({ message: "Crédito no encontrado" });
    }

    let mensajeDispersión = "";
    if (updatedCredit.estadoDeCredito === "Aprobado") {
      try {
        const dispersionData = await enviarSolicitudAprobacion({
          _id: updatedCredit._id,
          numeroDeCuenta: updatedCredit.numeroDeCuenta,
          nombreBanco: updatedCredit.claveBanco,
          nombreDelCliente: updatedCredit.nombreDelCliente,
          valorEnviar: updatedCredit.valorEnviado
        });

        if (!dispersionData || dispersionData.error) {
          mensajeDispersión = "Orden de dispersión no enviada.";
          await VerificationCollection.findByIdAndUpdate(req.params.id, {
            $set: { estadoDeCredito: "Pendiente" },
          });

          throw new Error(dispersionData?.error || "Error desconocido en la dispersión");
        }

        mensajeDispersión = "Orden de dispersión enviada.";
      } catch (error) {

        await VerificationCollection.findByIdAndUpdate(req.params.id, {
          $set: { estadoDeCredito: "Pendiente" },
        });
        return res.status(500).json({
          message: "Error en la dispersión, estado revertido a 'Pendiente'",
          error: error.message
        });
      }
    }

    return res.status(200).json({
      mensajeDispersión,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



// Eliminar un crédito
export const deleteCredit = async (req, res) => {
  try {
    const deletedCredit = await VerificationCollection.findByIdAndDelete(req.params.id);
    if (!deletedCredit) return res.status(404).json({ message: 'Crédito no encontrado' });
    res.json({ message: 'Crédito eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Función para obtener el conteo total de documentos en la colección
export const getVerificationCount = async (req, res) => {
  try {
    // Usando Mongoose:
    const count = await VerificationCollection.countDocuments();

    res.json({ collectionCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Error al contar los documentos'.error.message });
  }
}

export const getCustomerFlow = async (req, res) => {
  try {
    const { fechaDeReembolso, semana, ...filters } = req.query;

    let startDate, endDate;

    if (semana) {
      // Si se recibe una semana, calcular el rango de esa semana
      const { startOfWeek, endOfWeek } = calculateDateRangeForWeek(semana);
      startDate = startOfWeek.startOf('day');
      endDate = endOfWeek.endOf('day');
    } else {
      // Si no se recibe semana, calcular desde viernes anterior hasta hoy
      const today = moment();
      const dayOfWeek = today.day(); // 0 = domingo, 1 = lunes, ..., 5 = viernes, 6 = sábado

      const lastFriday = dayOfWeek >= 5
        ? today.clone().subtract(dayOfWeek - 5, 'days')
        : today.clone().subtract(7 - (5 - dayOfWeek), 'days');

      startDate = lastFriday.startOf('day');
      endDate = today.endOf('day');
    }

    const dateFilter = { $gte: startDate.toISOString(), $lte: endDate.toISOString() };

    const filter = {
      ...filters,
      estadoDeCredito: { '$in': ['Dispersado', 'Pagado', 'Pagado con Extensión'] },
      fechaDeReembolso: dateFilter
    };

    // Traer préstamos
    const loans = await VerificationCollection.find(filter);

    const result = {};

    loans.forEach(loan => {
      const fecha = moment(loan.fechaDeReembolso).format('YYYY-MM-DD');
      const producto = loan.nombreDelProducto;

      if (!result[fecha]) {
        result[fecha] = {};
      }
      if (!result[fecha][producto]) {
        result[fecha][producto] = { pagaron: 0, totalPagar: 0 };
      }

      result[fecha][producto].totalPagar += 1;

      if (loan.estadoDeCredito === 'Pagado' || loan.estadoDeCredito === 'Pagado con Extensión') {
        result[fecha][producto].pagaron += 1;
      }
    });

    // Agregar días que no tengan préstamos
    let currentDate = startDate.clone();
    while (currentDate.isSameOrBefore(endDate)) {
      const fecha = currentDate.format('YYYY-MM-DD');
      if (!result[fecha]) {
        result[fecha] = {};
      }
      // Asegurar que al menos haya un registro vacío
      if (Object.keys(result[fecha]).length === 0) {
        result[fecha]['SinProducto'] = { pagaron: 0, totalPagar: 0 };
      }
      currentDate.add(1, 'day');
    }

    res.json(result);
  } catch (error) {
    console.error('Error al obtener los préstamos:', error);
    res.status(500).json({ message: 'Error al obtener los préstamos.', error: error.message });
  }
};


export const getUpdateSTP = async (req, res) => {
  try {
    const credit = await VerificationCollection.findOne({
      idDeSubFactura: req.params.idDeSubFactura,
    });

    if (!credit) {
      return res.status(404).json({ message: "Crédito no encontrado" });
    }

    const creditData = credit.toObject();

    creditData.contactos = [];
    creditData.sms = [];
    creditData.acotacionesCobrador = [];
    creditData.acotaciones = [];
    creditData.trackingDeOperaciones = [];
    creditData.cuentasBancarias = [];

    creditData.stdDispersion = {};

    if (creditData.fechaDeTramitacionDelCaso) {
      creditData.fechaDeTramitacionDelCaso = formatFechaYYYYMMDD(creditData.fechaDeTramitacionDelCaso);
    }
    res.json(creditData);
  } catch (error) {
    console.error("Error en getUpdateSTP:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getForUpdateSTP = async (req, res) => {
  try {
    const credit = await VerificationCollection.findOne({
      cuentaClabeParaCobro: req.params.cuentaClabeParaCobro,
    });

    if (!credit) {
      return res.status(404).json({ message: "Crédito no encontrado" });
    }

    const creditData = credit.toObject();

    creditData.contactos = [];
    creditData.sms = [];
    creditData.acotacionesCobrador = [];
    creditData.acotaciones = [];
    creditData.trackingDeOperaciones = [];
    creditData.cuentasBancarias = [];

    creditData.stdDispersion = {};

    if (creditData.fechaDeTramitacionDelCaso) {
      creditData.fechaDeTramitacionDelCaso = formatFechaYYYYMMDD(creditData.fechaDeTramitacionDelCaso);
    }
    res.json(creditData);
  } catch (error) {
    console.error("Error en getUpdateSTP:", error);
    res.status(500).json({ message: error.message });
  }
};

export const reporteComision = async (req, res) => {
  try {
    const { nombreUsuario } = req.query;

    if (!nombreUsuario) {
      return res.status(400).json({ error: "El parámetro nombreUsuario es obligatorio" });
    }

    const resultados = await VerificationCollectionBackup.aggregate([
      { $unwind: "$historialDeAsesores" },
      { $match: { "historialDeAsesores.cuentaPersonal": nombreUsuario } },
      {
        $group: {
          _id: {
            fecha: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$historialDeAsesores.fecha" } } }
          },
          totalCasos: { $sum: 1 },
          datosAsesor: { $first: "$historialDeAsesores" }
        }
      },
      { $sort: { "_id.fecha": -1 } }
    ]);

    const response = resultados.map(item => ({
      fecha: item._id.fecha,
      totalCasos: item.totalCasos,
      nombreAsesor: item.datosAsesor.nombreAsesor,
      cuentaOperativa: item.datosAsesor.cuentaOperativa,
      cuentaPersonal: item.datosAsesor.cuentaPersonal
    }));

    res.json({ data: response });
  } catch (error) {
    console.error("Error en reporteComision:", error);
    res.status(500).json({ error: "Error interno del servidor.", details: error.message });
  }
};

export const getSegmentedCases = async (req, res) => {
  try {
    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'days').startOf('day');
    const dayAfterTomorrow = moment().add(2, 'days').startOf('day');
    const yesterday = moment().subtract(1, 'days').startOf('day');
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day');
    const fifteenDaysAgo = moment().subtract(15, 'days').startOf('day');

    const filter = {
      estadoDeCredito: { $in: ["Dispersado", "Pagado", "Pagado con Extensión"] },
      fechaDeCobro: { $gte: fifteenDaysAgo.toISOString(), $lte: dayAfterTomorrow.toISOString() }
    };

    const credits = await VerificationCollection.find(filter);

    let totalCasos = credits.length;
    let D0 = 0, D1 = 0, D2 = 0, S1 = 0, S2 = 0;

    credits.forEach(credit => {
      const fechaCobro = moment(credit.fechaDeCobro).startOf('day'); // Ignoramos hora

      if (fechaCobro.isSame(today, 'day')) {
        D0++;
      } else if (fechaCobro.isSame(tomorrow, 'day')) {
        D1++;
      } else if (fechaCobro.isSame(dayAfterTomorrow, 'day')) {
        D2++;
      } else if (fechaCobro.isBetween(sevenDaysAgo, yesterday, 'day', '[]')) {
        S1++;
      } else if (fechaCobro.isBetween(fifteenDaysAgo, sevenDaysAgo.clone().subtract(1, 'day'), 'day', '[]')) {
        S2++;
      }
      // Si no entra en ningún segmento, no hacemos nada.
    });

    res.json({
      totalCasos,
      segmentos: { D0, D1, D2, S1, S2 }
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los casos segmentados.", error: error.message });
  }
};

export const getAllCreditsOrderByDate = async (req, res) => {
  try {
    const {
      cuentaVerificador,
      cuentaCobrador,
      cuentaAuditor,
      numeroDePrestamo,
      idDeSubFactura,
      estadoDeCredito,
      nombreDelCliente,
      numeroDeTelefonoMovil,
      clientesNuevo,
      nombreDelProducto,
      fechaDeReembolso,
      fechaDeDispersion,
      fechaDeCobro,
      fechaDeCreacionDeLaTarea,
      fechaDeTramitacionDelCaso,
      fechaDeTramitacionDeCobro,
      limit = 5,
      page = 1
    } = req.query;

    // Construcción dinámica del filtro
    const filter = {};
    if (cuentaVerificador) {
      filter.cuentaVerificador = { $regex: cuentaVerificador, $options: "i" };
    }
    if (cuentaCobrador) {
      filter.cuentaCobrador = { $regex: cuentaCobrador, $options: "i" };
    }
    if (cuentaAuditor) {
      filter.cuentaAuditor = { $regex: cuentaAuditor, $options: "i" };
    }
    if (numeroDePrestamo) {
      filter.numeroDePrestamo = { $regex: numeroDePrestamo, $options: "i" };
    }
    if (idDeSubFactura) {
      filter.idDeSubFactura = { $regex: idDeSubFactura, $options: "i" };
    }

    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map(palabra => palabra.trim());
      filter.estadoDeCredito = palabras;
    }

    if (nombreDelCliente) {
      filter.nombreDelCliente = { $regex: nombreDelCliente, $options: "i" };
    }
    if (numeroDeTelefonoMovil) {
      filter.numeroDeTelefonoMovil = { $regex: numeroDeTelefonoMovil, $options: "i" };
    }
    if (clientesNuevo) {
      filter.clientesNuevo = clientesNuevo === "true"; // Convertir a booleano
    }
    if (nombreDelProducto) {
      filter.nombreDelProducto = { $regex: nombreDelProducto, $options: "i" };
    }

    aplicarFiltroFecha(filter, "fechaDeCreacionDeLaTarea", fechaDeCreacionDeLaTarea);
    aplicarFiltroFecha(filter, "fechaDeTramitacionDelCaso", fechaDeTramitacionDelCaso);
    aplicarFiltroFecha(filter, "fechaDeTramitacionDeCobro", fechaDeTramitacionDeCobro);
    aplicarFiltroFecha(filter, "fechaDeCobro", fechaDeCobro);
    aplicarFiltroFecha(filter, "fechaDeReembolso", fechaDeReembolso);
    aplicarFiltroFecha(filter, "fechaDeDispersion", fechaDeDispersion);

    // obtener el total de documentos
    const totalDocuments = await VerificationCollection.countDocuments(filter);

    // calcular el total de pagianas
    const totalPages = Math.ceil(totalDocuments / limit);
    // Consulta a MongoDB con filtro
    const credits = await VerificationCollection.find(filter)
      .sort({ createdAt: -1 })  // Ordenar en orden descendente por 'createdAt'
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      data: credits,
      currentPage: parseInt(page),
      totalPages,
      totalDocuments,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los créditos.", error: error.message });
  }
};