import moment from 'moment';
import VerificationCollection from '../models/VerificationCollection.js';
import { VerificationCollectionBackup } from '../models/verificationCollectionBackupSchema.js'; '../models/verificationCollectionBackupSchema.js';
import { formatFechaYYYYMMDD } from '../utilities/currentWeek.js';
import { createTracking } from './TrakingOperacionesDeCasos.js';
import { aplicarFiltroFecha } from '../utilities/filters.js';

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
    nombreBanco: credit.nombreBanco,
    valorEnviar: credit.valorEnviar,
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
    const { fechaDeReembolso } = req.query;

    if (!fechaDeReembolso) {
      return res.status(400).json({ message: "Faltan parámetros requeridos" });
    }

    let filter = {};

    // Convertimos las fechas de reembolso en rangos
    const fechas = fechaDeReembolso.split(",").map(f => f.trim());

    if (fechas.length === 2) {
      const fechaInicio = moment(fechas[0]).startOf("day").toISOString();
      const fechaFin = moment(fechas[1]).endOf("day").toISOString();
      filter.fechaDeReembolso = { $gte: fechaInicio, $lte: fechaFin };
    } else {
      const fechaFormateada = moment(fechaDeReembolso).format("YYYY-MM-DD");
      filter.fechaDeReembolso = { $regex: fechaFormateada, $options: "i" };
    }

    // Definir las fechas permitidas (hoy, mañana y pasado mañana)
    const hoy = moment().format("YYYY-MM-DD");
    const manana = moment().add(1, "days").format("YYYY-MM-DD");
    const pasadoManana = moment().add(2, "days").format("YYYY-MM-DD");

    const result = await VerificationCollectionBackup.aggregate([
      {
        $match: {
          ...filter,
          fechaDeCobro: { $regex: `^(${hoy}|${manana}|${pasadoManana})` }
        }
      },
      {
        $group: {
          _id: {
            nombreDelProducto: "$nombreDelProducto",
            fechaDeReembolso: { $substr: ["$fechaDeReembolso", 0, 10] }
          },
          total: { $sum: 1 },
          totalCasosCobrados: {
            $sum: { $cond: [{ $eq: ["$estadoDeCredito", "Pagado"] }, 1, 0] }
          },
          totalMontoCobrado: {
            $sum: { $cond: [{ $eq: ["$estadoDeCredito", "Pagado"] }, "$valorSolicitado", 0] }
          },
          totalMonto: { $sum: "$valorSolicitado" }
        }
      },
      {
        $project: {
          _id: 0,
          nombreDelProducto: "$_id.nombreDelProducto",
          fechaDeReembolso: "$_id.fechaDeReembolso",
          total: 1,
          totalCasosCobrados: 1,
          totalMontoCobrado: 1,
          totalMonto: 1
        }
      }
    ]);

    const formattedResult = result.reduce((acc, item) => {
      acc[item.nombreDelProducto] = {
        nombreDelProducto: item.nombreDelProducto,
        total: item.total,
        totalCasosCobrados: item.totalCasosCobrados,
        totalMontoCobrado: item.totalMontoCobrado,
        totalMonto: item.totalMonto,
        fechaDeReembolso: item.fechaDeReembolso,
      };
      return acc;
    }, {});

    res.json(formattedResult);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el flujo de clientes.", error: error.message });
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
