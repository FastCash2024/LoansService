import VerificationCollection from '../models/VerificationCollection.js';
import moment from 'moment';
import { formatFechaYYYYMMDD } from '../utilities/currentWeek.js';
import { createTracking } from './TrakingOperacionesDeCasos.js';
import { obtenerFechaMexicoISO } from '../utilities/dates.js'
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

    if (fechaDeCreacionDeLaTarea) {
      const fechaInicio = moment(fechaDeCreacionDeLaTarea).startOf('day').toISOString();
      const fechaFin = moment(fechaDeCreacionDeLaTarea).endOf('day').toISOString();
      filter.fechaDeCreacionDeLaTarea = {
        $gte: fechaInicio,
        $lte: fechaFin
      };
    }

    if (fechaDeTramitacionDelCaso) {
      const fechaInicio = moment(fechaDeTramitacionDelCaso).startOf('day').toISOString();
      const fechaFin = moment(fechaDeTramitacionDelCaso).endOf('day').toISOString();
      filter.fechaDeTramitacionDelCaso = {
        $gte: fechaInicio,
        $lte: fechaFin
      };
    }
    if (fechaDeTramitacionDeCobro) {
      const fechaInicio = moment(fechaDeTramitacionDeCobro).startOf('day').toISOString();
      const fechaFin = moment(fechaDeTramitacionDeCobro).endOf('day').toISOString();
      filter.fechaDeTramitacionDeCobro = {
        $gte: fechaInicio,
        $lte: fechaFin
      };
    }

    if (fechaDeReembolso) {
      const fechas = fechaDeReembolso.split(",").map(f => f.trim());

      if (fechas.length === 2) {
        filter.fechaDeReembolso = {
          $gte: new Date(fechas[0]).toISOString().split("T")[0],
          $lte: new Date(fechas[1]).toISOString().split("T")[0],
        };
      } else {
        const fechaInicio = moment(fechaDeReembolso).startOf('day').toISOString();
        const fechaFin = moment(fechaDeReembolso).endOf('day').toISOString();
        filter.fechaDeReembolso = {
          $gte: fechaInicio,
          $lte: fechaFin
        };
      }
    }

    // obtener el total de documentos
    const totalDocuments = await VerificationCollection.countDocuments(filter);

    // calcular el total de pagianas
    const totalPages = Math.ceil(totalDocuments / limit);
    // Consulta a MongoDB con filtro
    const credits = await VerificationCollection.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      data: credits,
      currentPage: parseInt(page),
      totalPages,
      totalDocuments,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los créditos.".error.message });
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

    await createTracking(trackingData);

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

    const fechaFormateada = new Date(fechaDeReembolso).toISOString().split('T')[0];

    const filter = {
      fechaDeReembolso: { $regex: fechaFormateada, $options: "i" }
    };

    const result = await VerificationCollection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            nombreDelProducto: "$nombreDelProducto",
            fechaDeReembolso: { $substr: ["$fechaDeReembolso", 0, 10] }
          },
          total: { $sum: 1 }, // Cuenta el total de documentos en el grupo
          totalCasosCobrados: {
            $sum: { $cond: [{ $eq: ["$estadoDeCredito", "Pagado"] }, 1, 0] }
          },
          totalMontoCobrado: {
            $sum: { $cond: [{ $eq: ["$estadoDeCredito", "Pagado"] }, "$valorSolicitado", 0] }
          },
          totalMonto: { $sum: "$valorSolicitado" } // Nuevo campo para el total de todos los valores
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
    res.status(500).json({ message: "Error al obtener el flujo de clientes.".error.message });
  }
};

export const getReporteDiario = async (req, res) => {
  try {
    const { fecha, estadoDeCredito } = req.query;
    const today = fecha || moment().format('DD/MM/YYYY');

    // obtener los casos del dia
    const filter = {
      $expr: {
        $eq: [
          {
            $dateToString: {
              format: '%d/%m/%Y',
              date: { $toDate: '$fechaDeTramitacionDelCaso' },
            },
          },
          today,
        ],
      },
    };

    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map((palabra) => palabra.trim());
      filter.estadoDeCredito = { $in: palabras };
    }

    const casosDelDia = await VerificationCollection.find(filter);

    if (casosDelDia.length === 0) {
      return res.json({
        data: {},
        message: `No se encontraron casos del día ${today} con el estado ${estadoDeCredito || 'N/A'}.`,
      });
    }

    const resultado = {};

    casosDelDia.forEach((caso) => {
      const tipo = caso.cuentaVerificador || 'Desconocido';

      if (!resultado[tipo]) {
        resultado[tipo] = {
          aprobados10am: 0,
          reprobados10am: 0,
          aprobados12am: 0,
          reprobados12am: 0,
          aprobados14pm: 0,
          reprobados14pm: 0,
          aprobados16pm: 0,
          reprobados16pm: 0,
          aprobadosTotal: 0,
          reprobadosTotal: 0,
          otrosTotal: 0,
        };
      }

      const fechaTramitacion = moment(caso.fechaDeTramitacionDelCaso).format('DD/MM/YYYY');
      const fechaDispersion = caso.fechaDeDispersion
        ? moment(caso.fechaDeDispersion).format('DD/MM/YYYY')
        : null;

      const hora = caso.estadoDeCredito === 'Reprobado'
        ? obtenerFechaMexicoISO(caso.fechaDeTramitacionDelCaso)
        : caso.fechaDeDispersion
          ? obtenerFechaMexicoISO(caso.fechaDeDispersion)
          : null;

      const esAprobado = fechaTramitacion === fechaDispersion;

      if (esAprobado && (caso.estadoDeCredito === 'Dispersado' || caso.estadoDeCredito === 'Aprobado')) {
        if (hora !== null) {
          if (hora >= 7 && hora <= 10) resultado[tipo].aprobados10am += 1;
          if (hora > 10 && hora <= 12) resultado[tipo].aprobados12am += 1;
          if (hora > 12 && hora <= 14) resultado[tipo].aprobados14pm += 1;
          if (hora > 14 && hora <= 16) resultado[tipo].aprobados16pm += 1;
        }
        resultado[tipo].aprobadosTotal += 1;
      } else if (caso.estadoDeCredito === 'Reprobado') {
        if (hora !== null) {
          if (hora >= 7  && hora <= 10) resultado[tipo].reprobados10am += 1;
          if (hora > 10 && hora <= 12) resultado[tipo].reprobados12am += 1;
          if (hora > 12 && hora <= 14) resultado[tipo].reprobados14pm += 1;
          if (hora > 14 && hora <= 16) resultado[tipo].reprobados16pm += 1;
        }
        resultado[tipo].reprobadosTotal += 1;
      } else if (!["Dispersado", "Aprobado", "Pendiente"].includes(caso.estadoDeCredito)) {
        resultado[tipo].otrosTotal += 1;
      }
    });

    res.json({ data: resultado });
  } catch (error) {
    console.error('Error al obtener el reporte diario:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
};

export const getReporteDiarioTotales = async (req, res) => {
  try {
    const { fecha, estadoDeCredito } = req.query;
    const today = fecha || moment().format('DD/MM/YYYY');

    const filter = {
      $expr: {
        $eq: [
          {
            $dateToString: {
              format: '%d/%m/%Y',
              date: { $toDate: '$fechaDeTramitacionDelCaso' },
            },
          },
          today,
        ],
      },
    };

    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map((palabra) => palabra.trim());
      filter.estadoDeCredito = { $in: palabras };
    }

    const casosDelDia = await VerificationCollection.find(filter);

    if (casosDelDia.length === 0) {
      return res.json({
        data: {},
        message: `No se encontraron casos del día ${today} con el estado ${estadoDeCredito || 'N/A'}.`,
      });
    }

    const totalesGenerales = {
      aprobados10am: 0,
      reprobados10am: 0,
      aprobados12am: 0,
      reprobados12am: 0,
      aprobados14pm: 0,
      reprobados14pm: 0,
      aprobados16pm: 0,
      reprobados16pm: 0,
      aprobadosTotal: 0,
      reprobadosTotal: 0,
    };

    const casosConAsesor = casosDelDia.filter(
      caso => caso.cuentaVerificador && ["Aprobado", "Reprobado", "Dispersado", "Pendiente"].includes(caso.estadoDeCredito)
    );

    const casosConAsesorErrados = casosDelDia.filter(
      caso => caso.cuentaVerificador && !["Aprobado", "Reprobado", "Dispersado", "Pendiente"].includes(caso.estadoDeCredito)
    );

    const totalCasosConAsesor = casosConAsesor.length;
    const totalCasosConAsesorErrados = casosConAsesorErrados.length;

    casosDelDia.forEach((caso) => {

      const fechaTramitacion = moment(caso.fechaDeTramitacionDelCaso).format('DD/MM/YYYY');
      const fechaDispersion = caso.fechaDeDispersion
        ? moment(caso.fechaDeDispersion).format('DD/MM/YYYY')
        : null;

      const hora =
        caso.estadoDeCredito === 'Reprobado'
          ? obtenerFechaMexicoISO(caso.fechaDeTramitacionDelCaso)
          : caso.fechaDeDispersion && fechaTramitacion === fechaDispersion
            ? obtenerFechaMexicoISO(caso.fechaDeDispersion)
            : null;

      if (["Aprobado", "Dispersado"].includes(caso.estadoDeCredito) && fechaTramitacion === fechaDispersion) {
        if (hora !== null) {
          if (hora >= 7 && hora <= 10) totalesGenerales.aprobados10am += 1;
          if (hora > 10 && hora <= 12) totalesGenerales.aprobados12am += 1;
          if (hora > 12 && hora <= 14) totalesGenerales.aprobados14pm += 1;
          if (hora > 14 && hora <= 16) totalesGenerales.aprobados16pm += 1;
        }
        totalesGenerales.aprobadosTotal += 1;
      }
      else if (caso.estadoDeCredito === 'Reprobado') {
        if (hora !== null) {
          if (hora >= 7 && hora <= 10) totalesGenerales.reprobados10am += 1;
          if (hora > 10 && hora <= 12) totalesGenerales.reprobados12am += 1;
          if (hora > 12 && hora <= 14) totalesGenerales.reprobados14pm += 1;
          if (hora > 14 && hora <= 16) totalesGenerales.reprobados16pm += 1;
        }
        totalesGenerales.reprobadosTotal += 1;
      }
    });


    totalesGenerales.totalCasosConAsesor = totalCasosConAsesor;
    totalesGenerales.totalCasosConAsesorErrados = totalCasosConAsesorErrados;

    res.json({ totalesGenerales });
  } catch (error) {
    console.error('Error al obtener el reporte diario:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
};

export const getReporteCDiario = async (req, res) => {
  try {
    const { fecha, estadoDeCredito } = req.query;
    
    const fechaHoy = new Date();
    const opciones = { timeZone: 'America/Mexico_City' };

    // Obtener los valores por separado y formatearlos
    const dia = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[0].padStart(2, '0');
    const mes = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[1].padStart(2, '0');
    const anio = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[2];

    const today = fecha || `${dia}/${mes}/${anio}`;

    const filter = {
      $or: [
        {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%d/%m/%Y',
                      date: { $toDate: '$fechaDeTramitacionDeCobro' },
                    },
                  },
                  today,
                ],
              },
            },
            {
              estadoDeCredito: { $in: ['Pagado', 'Pagado con Extensión', 'Dispersado'] },
            },
          ],
        },
        {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%d/%m/%Y',
                      date: { $toDate: '$fechaRegistroComunicacion' },
                    },
                  },
                  today,
                ],
              },
            },
            {
              estadoDeComunicacion: 'Pagará pronto',
            },
          ],
        },
      ],
    };

    // Si se especifica estadoDeCredito, aplicar filtro adicional
    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map((palabra) => palabra.trim());
      filter.$or.forEach((cond) => {
        if (cond[1] && cond[1].estadoDeCredito) {
          cond[1].estadoDeCredito = { $in: palabras };
        }
      });
    }

    const casosDelDia = await VerificationCollection.find(filter);

    if (casosDelDia.length === 0) {
      return res.json({
        data: {},
        message: `No se encontraron casos del día ${today} con el estado ${estadoDeCredito || 'Pagado'}.`,
      });
    }

    const resultado = {};
    
    casosDelDia.forEach((caso) => {
      const tipo = caso.cuentaCobrador || 'Desconocido';
      if (!resultado[tipo]) {
        resultado[tipo] = {
          pagos10am: 0,
          ptp10am: 0,
          tasaRecuperacion10am: 0,
          pagos12am: 0,
          ptp12am: 0,
          tasaRecuperacion12am: 0,
          pagos2pm: 0,
          ptp2pm: 0,
          tasaRecuperacion2pm: 0,
          pagos4pm: 0,
          ptp4pm: 0,
          tasaRecuperacion4pm: 0,
          pagos6pm: 0,
          ptp6pm: 0,
          tasaRecuperacion6pm: 0,
          pagosTotal: 0,
          tasaRecuperacionTotal: 0,
          casosTotales: 0,
        };
      }

      resultado[tipo].casosTotales += 1

      let hora;
      const monto = parseFloat(caso.valorSolicitado || 0);

      if (
        (caso.estadoDeCredito === 'Pagado' || caso.estadoDeCredito === 'Pagado con Extensión') &&
        moment(caso.fechaDeTramitacionDeCobro).format('DD/MM/YYYY') === moment(caso.fechaDeReembolso).format('DD/MM/YYYY')
      ) {
        // hora = new Date(caso.fechaDeReembolso).getHours();
        hora = obtenerFechaMexicoISO(caso.fechaDeReembolso);

        // console.log("hora: ", hora);
        

        if (hora >= 7 && hora <= 10) {
          resultado[tipo].pagos10am += 1;
          resultado[tipo].tasaRecuperacion10am += monto;
        }
        if (hora > 10 && hora <= 12) {
          resultado[tipo].pagos12am += 1;
          resultado[tipo].tasaRecuperacion12am += monto;
        }
        if (hora > 12 && hora <= 14) {
          resultado[tipo].pagos2pm += 1;
          resultado[tipo].tasaRecuperacion2pm += monto;
        }
        if (hora > 14 && hora <= 16) {
          resultado[tipo].pagos4pm += 1;
          resultado[tipo].tasaRecuperacion4pm += monto;
        }
        if (hora > 16 && hora <= 18) {
          resultado[tipo].pagos6pm += 1;
          resultado[tipo].tasaRecuperacion6pm += monto;
        }
        resultado[tipo].pagosTotal += 1;
        resultado[tipo].tasaRecuperacionTotal += monto;
      }

      if (caso.estadoDeComunicacion === 'Pagará pronto') {
        hora = obtenerFechaMexicoISO(caso.fechaRegistroComunicacion);

        if (hora >= 7 && hora <= 10) resultado[tipo].ptp10am += 1;
        if (hora > 10 && hora <= 12) resultado[tipo].ptp12am += 1;
        if (hora > 12 && hora <= 14) resultado[tipo].ptp2pm += 1;
        if (hora > 14 && hora <= 16) resultado[tipo].ptp4pm += 1;
        if (hora > 16 && hora <= 18) resultado[tipo].ptp6pm += 1;
      }
    });

    res.json({ data: resultado });
  } catch (error) {
    console.error('Error al obtener los datos de reembolso:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
};

export const getReporteCDiarioTotales = async (req, res) => {
  try {
    const { fecha, estadoDeCredito } = req.query;

    const fechaHoy = new Date();
    const opciones = { timeZone: 'America/Mexico_City' };

    // Obtener los valores por separado y formatearlos
    const dia = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[0].padStart(2, '0');
    const mes = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[1].padStart(2, '0');
    const anio = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[2];

    const today = fecha || `${dia}/${mes}/${anio}`;


    const filter = {
      $or: [
        {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%d/%m/%Y',
                      date: { $toDate: '$fechaDeTramitacionDeCobro' },
                    },
                  },
                  today,
                ],
              },
            },
            {
              estadoDeCredito: { $in: ['Dispersado', 'Pagado', 'Pagado con Extensión'] },
            },
          ],
        },
        {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%d/%m/%Y',
                      date: { $toDate: '$fechaRegistroComunicacion' },
                    },
                  },
                  today,
                ],
              },
            },
            {
              estadoDeComunicacion: 'Pagará pronto',
            },
          ],
        },
      ],
    };

    const casosDelDia = await VerificationCollection.find(filter);

    if (casosDelDia.length === 0) {
      return res.json({
        data: {},
        message: `No se encontraron casos para el día ${today}.`,
      });
    }

    // Inicializar totales
    let totales = {
      pagos10am: 0,
      ptp10am: 0,
      tasaRecuperacion10am: 0,
      pagos12am: 0,
      ptp12am: 0,
      tasaRecuperacion12am: 0,
      pagos2pm: 0,
      ptp2pm: 0,
      tasaRecuperacion2pm: 0,
      pagos4pm: 0,
      ptp4pm: 0,
      tasaRecuperacion4pm: 0,
      pagos6pm: 0,
      ptp6pm: 0,
      tasaRecuperacion6pm: 0,
      pagosTotal: 0,
      tasaRecuperacionTotal: 0,
    };

    // const casosPorSegmento = { D0: [], D1: [], D2: [], S1: [], S2: [] };
    // const fechaMexico = new Date().toLocaleString('en-US', {
    //   timeZone: 'America/Mexico_City', // Zona horaria de Ciudad de México
    //   weekday: 'short',
    //   year: 'numeric',
    //   month: 'short',
    //   day: 'numeric',
    //   hour: '2-digit',
    //   minute: '2-digit',
    //   second: '2-digit',
    //   hour12: false,
    // });

    // const fechaActual = new Date(fechaMexico).toString();

    // casosDelDia.forEach(caso => {
    //   const fechaTramitacion = ajustarFechaInicio(caso.fechaDeTramitacionDelCaso)

    //   const diferenciaDiasTramitacion = Math.round((new Date(fechaTramitacion) - fechaActual) * (-1) / (1000 * 60 * 60 * 24));

    //   // Validación: Si la fecha de tramitación es hoy, no se asigna
    //   if (diferenciaDiasTramitacion === 0) {
    //     console.log(`El caso ${caso.numeroDePrestamo} es reciente y no puede asignarse.`);
    //     return;
    //   }

    //   // Validación: Solo se asignan casos cuya fecha de tramitación tenga al menos 5 días
    //   if (diferenciaDiasTramitacion < 5) {
    //     console.log(`El caso ${caso.numeroDePrestamo} aún no puede asignarse. Se necesita esperar ${5 - diferenciaDiasTramitacion} días más.`);
    //     return;
    //   }


    //   if (diferenciaDiasTramitacion === 7) {
    //     casosPorSegmento.D0.push(caso);
    //   } else if (diferenciaDiasTramitacion === 6) {
    //     casosPorSegmento.D1.push(caso);
    //   } else if (diferenciaDiasTramitacion === 5) {
    //     casosPorSegmento.D2.push(caso);
    //   } else if (diferenciaDiasTramitacion > 7 && diferenciaDiasTramitacion < 15) {
    //     casosPorSegmento.S1.push(caso);
    //   } else if (diferenciaDiasTramitacion > 14 && diferenciaDiasTramitacion <= 22) {
    //     casosPorSegmento.S2.push(caso);
    //   }
    // });

    // console.log(casosPorSegmento)



    const casosConAsesor = casosDelDia.filter(
      (caso) => caso.cuentaCobrador && ["Dispersado", "Pagado", "Pagado con Extensión"].includes(caso.estadoDeCredito)
    );

    const totalCasosConAsesor = casosConAsesor.length;

    casosDelDia.forEach((caso) => {
      let hora;
      const monto = parseFloat(caso.valorSolicitado || 0);

      if (
        (caso.estadoDeCredito === 'Pagado' || caso.estadoDeCredito === 'Pagado con Extensión') &&
        moment(caso.fechaDeTramitacionDeCobro).format('DD/MM/YYYY') === moment(caso.fechaDeReembolso).format('DD/MM/YYYY')
      ) {
        hora = obtenerFechaMexicoISO(caso.fechaDeReembolso);

        if (hora >= 7 && hora <= 10) {
          totales.pagos10am += 1;
          totales.tasaRecuperacion10am += monto;
        }
        if (hora > 10 && hora <= 12) {
          totales.pagos12am += 1;
          totales.tasaRecuperacion12am += monto;
        }
        if (hora > 12 && hora <= 14) {
          totales.pagos2pm += 1;
          totales.tasaRecuperacion2pm += monto;
        }
        if (hora > 14 && hora <= 16) {
          totales.pagos4pm += 1;
          totales.tasaRecuperacion4pm += monto;
        }
        if (hora > 16 && hora <= 18) {
          totales.pagos6pm += 1;
          totales.tasaRecuperacion6pm += monto;
        }
        totales.pagosTotal += 1;
        totales.tasaRecuperacionTotal += monto;
      }

      if (caso.estadoDeComunicacion === 'Pagará pronto') {
        hora = obtenerFechaMexicoISO(caso.fechaRegistroComunicacion);

        if (hora >= 7 && hora <= 10) totales.ptp10am += 1;
        if (hora > 10 && hora <= 12) totales.ptp12am += 1;
        if (hora > 12 && hora <= 14) totales.ptp2pm += 1;
        if (hora > 14 && hora <= 16) totales.ptp4pm += 1;
        if (hora > 16 && hora <= 18) totales.ptp6pm += 1;
      }
    });

    totales.totalesConAsesor = totalCasosConAsesor;

    res.json({ totales });

  } catch (error) {
    console.error('Error al obtener los datos de totales:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
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


export const reporteComision = async (req, res) => {
  try {
    const { nombreUsuario } = req.query;

    if (!nombreUsuario) {
      return res.status(400).json({ error: "El parámetro nombreUsuario es obligatorio" });
    }

    const resultados = await VerificationCollection.aggregate([
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
