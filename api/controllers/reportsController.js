import moment from 'moment';
import VerificationCollection from '../models/VerificationCollection.js';
import { VerificationCollectionBackup } from '../models/verificationCollectionBackupSchema.js'; '../models/verificationCollectionBackupSchema.js';
import { obtenerFechaMexicoISO } from '../utilities/dates.js'

export const getReporteDiario = async (req, res) => {
  try {
    const { fecha, estadoDeCredito } = req.query;

    const fechaHoy = new Date();
    const opciones = { timeZone: 'America/Mexico_City' };

    // Obtener los valores por separado y formatearlos
    const dia = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[0].padStart(2, '0');
    const mes = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[1].padStart(2, '0');
    const anio = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[2];

    const today = fecha || `${anio}-${mes}-${dia}`;

    // obtener los casos del dia
    let filter = {};
    if (fecha) {
      filter = {
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $toDate: "$fechaBackoup" },
              },
            },
            today,
          ],
        },
      };
    } else {

      filter = {
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $toDate: '$fechaDeTramitacionDelCaso' },
              },
            },
            today,
          ],
        },
      };
    }

    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map((palabra) => palabra.trim());
      filter.estadoDeCredito = { $in: palabras };
    }

    const collection = fecha ? VerificationCollectionBackup : VerificationCollection;
    const casosDelDia = await collection.find(filter);

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
          if (hora >= 7 && hora < 10) resultado[tipo].aprobados10am += 1;
          if (hora >= 10 && hora < 12) resultado[tipo].aprobados12am += 1;
          if (hora >= 12 && hora < 14) resultado[tipo].aprobados14pm += 1;
          if (hora >= 14 && hora < 16) resultado[tipo].aprobados16pm += 1;
        }
        resultado[tipo].aprobadosTotal += 1;
      }
      else if (caso.estadoDeCredito === 'Reprobado') {
        if (hora !== null) {
          if (hora >= 7 && hora < 10) resultado[tipo].reprobados10am += 1;
          if (hora >= 10 && hora < 12) resultado[tipo].reprobados12am += 1;
          if (hora >= 12 && hora < 14) resultado[tipo].reprobados14pm += 1;
          if (hora >= 14 && hora < 16) resultado[tipo].reprobados16pm += 1;
        }
        resultado[tipo].reprobadosTotal += 1;
      }
      else if (!["Dispersado", "Aprobado", "Pendiente"].includes(caso.estadoDeCredito)) {
        resultado[tipo].otrosTotal += 1;
      }
    });

    Object.keys(resultado).forEach(tipo => {
      resultado[tipo].aprobados12am += resultado[tipo].aprobados10am;
      resultado[tipo].aprobados14pm += resultado[tipo].aprobados12am;
      resultado[tipo].aprobados16pm += resultado[tipo].aprobados14pm;

      resultado[tipo].reprobados12am += resultado[tipo].reprobados10am;
      resultado[tipo].reprobados14pm += resultado[tipo].reprobados12am;
      resultado[tipo].reprobados16pm += resultado[tipo].reprobados14pm;
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

    const fechaHoy = new Date();
    const opciones = { timeZone: 'America/Mexico_City' };
    const dia = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[0].padStart(2, '0');
    const mes = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[1].padStart(2, '0');
    const anio = fechaHoy.toLocaleDateString('es-MX', opciones).split('/')[2];

    const today = fecha || `${anio}-${mes}-${dia}`;

    let filter = {}
    if (fecha) {
      filter = {
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $toDate: "$fechaBackoup" },
              },
            },
            today,
          ],
        },
      };
    } else {
      filter = {
        $expr: {
          $eq: [
            {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $toDate: '$fechaDeTramitacionDelCaso' },
              },
            },
            today,
          ],
        },
      };
    }

    if (estadoDeCredito) {
      const palabras = estadoDeCredito.split(/[,?]/).map((palabra) => palabra.trim());
      filter.estadoDeCredito = { $in: palabras };
    }

    const collection = fecha ? VerificationCollectionBackup : VerificationCollection;
    const casosDelDia = await collection.find(filter);

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

    totalesGenerales.aprobados12am += totalesGenerales.aprobados10am;
    totalesGenerales.aprobados14pm += totalesGenerales.aprobados12am;
    totalesGenerales.aprobados16pm += totalesGenerales.aprobados14pm;

    totalesGenerales.reprobados12am += totalesGenerales.reprobados10am;
    totalesGenerales.reprobados14pm += totalesGenerales.reprobados12am;
    totalesGenerales.reprobados16pm += totalesGenerales.reprobados14pm;

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
    const [dia, mes, anio] = fechaHoy.toLocaleDateString('es-MX', opciones).split('/').map(num => num.padStart(2, '0'));

    const today = fecha || `${anio}-${mes}-${dia}`;

    const collection = fecha ? VerificationCollectionBackup : VerificationCollection;

    const filter = {
      $or: [
        {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: {
                        $dateFromString: {
                          dateString: '$fechaDeTramitacionDeCobro',
                          onError: null,
                          onNull: null
                        },
                      },
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
                      format: '%Y-%m-%d',
                      date: {
                        $dateFromString: {
                          dateString: '$fechaRegistroComunicacion',
                          onError: null,
                          onNull: null
                        },
                      },
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

    const casosDelDia = await collection.find(filter);

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
          casosFueraDeHorario: 0,
          casosConAsesor: 0,
          casosSinAsesor: 0,
        };
      }

      const horaCredito = caso.fechaDeReembolso ? obtenerFechaMexicoISO(caso.fechaDeReembolso) : obtenerFechaMexicoISO(caso.fechaDeTramitacionDeCobro);
      const horaComunicacion = obtenerFechaMexicoISO(caso.fechaRegistroComunicacion);

      // Determinar si tiene o no asesor
      const tieneAsesor = !(caso.fechaDeTramitacionDeCobro === "Fecha no disponible" || !caso.fechaDeTramitacionDeCobro);

      if (['Dispersado', 'Pagado', 'Pagado con Extensión'].includes(caso.estadoDeCredito)) {
        if (horaCredito !== null) {
          resultado[tipo].casosTotales++;

          if ((['Pagado', 'Pagado con Extensión'].includes(caso.estadoDeCredito)) && (horaCredito >= 24 && horaCredito < 7)) {
            resultado[tipo].casosFueraDeHorario++;
          }

          if (
            (caso.estadoDeCredito === 'Pagado' || caso.estadoDeCredito === 'Pagado con Extensión') &&
            moment(caso.fechaDeTramitacionDeCobro).format('DD/MM/YYYY') === moment(caso.fechaDeReembolso).format('DD/MM/YYYY')
          ) {
            if (horaCredito >= 7 && horaCredito <= 10) {
              resultado[tipo].pagos10am += 1;
            }
            if (horaCredito > 10 && horaCredito <= 12) {
              resultado[tipo].pagos12am += 1;
            }
            if (horaCredito > 12 && horaCredito <= 14) {
              resultado[tipo].pagos2pm += 1;
            }
            if (horaCredito > 14 && horaCredito <= 16) {
              resultado[tipo].pagos4pm += 1;
            }
            if (horaCredito > 16 && horaCredito < 24) {
              resultado[tipo].pagos6pm += 1;
            }
            resultado[tipo].pagosTotal += 1;
          }
        }
      }

      if (caso.estadoDeComunicacion === 'Pagará pronto') {
        if (horaComunicacion >= 7 && horaComunicacion <= 10) {
          resultado[tipo].ptp10am += 1;
        }
        if (horaComunicacion > 10 && horaComunicacion <= 12) {
          resultado[tipo].ptp12am += 1;
        }
        if (horaComunicacion > 12 && horaComunicacion <= 14) {
          resultado[tipo].ptp2pm += 1;
        }
        if (horaComunicacion > 14 && horaComunicacion <= 16) {
          resultado[tipo].ptp4pm += 1;
        }
        if (horaComunicacion > 16 && horaComunicacion < 24) {
          resultado[tipo].ptp6pm += 1;
        }
      }

      // Aumentar contador de casos con o sin asesor
      if (tieneAsesor) {
        resultado[tipo].casosConAsesor++;
      } else {
        resultado[tipo].casosSinAsesor++;
      }
    });

    Object.keys(resultado).forEach((tipo) => {
      const datos = resultado[tipo];

      const calcularTasa = (pagos) => (datos.casosTotales > 0 ? (pagos / datos.casosTotales) * 100 : 0);

      // Sumar las tasas por cada franja horaria
      datos.pagos12am += datos.pagos10am;
      datos.ptp12am += datos.ptp10am;

      datos.pagos2pm += datos.pagos12am;
      datos.ptp2pm += datos.ptp12am;

      datos.pagos4pm += datos.pagos2pm;
      datos.ptp4pm += datos.ptp2pm;

      datos.pagos6pm += datos.pagos4pm;
      datos.ptp6pm += datos.ptp4pm;

      // Calcular tasas de recuperación
      datos.tasaRecuperacion10am = calcularTasa(datos.pagos10am);
      datos.tasaRecuperacion12am = calcularTasa(datos.pagos12am);
      datos.tasaRecuperacion2pm = calcularTasa(datos.pagos2pm);
      datos.tasaRecuperacion4pm = calcularTasa(datos.pagos4pm);
      datos.tasaRecuperacion6pm = calcularTasa(datos.pagos6pm);

      datos.tasaRecuperacionTotal = calcularTasa(datos.pagosTotal);
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

    const today = fecha || `${anio}-${mes}-${dia}`;

    const collection = fecha ? VerificationCollectionBackup : VerificationCollection;

    let filter = {
      $or: [
        {
          $and: [
            {
              $expr: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
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
                      format: '%Y-%m-%d',
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

    const casosDelDia = await collection.find(filter);

    if (casosDelDia.length === 0) {
      return res.json({
        data: {},
        message: `No se encontraron casos para el día ${today}.`,
      });
    }

    // Inicializar totales
    let totales = {
      pagos10am: 0, ptp10am: 0, tasaRecuperacion10am: 0,
      pagos12am: 0, ptp12am: 0, tasaRecuperacion12am: 0,
      pagos2pm: 0, ptp2pm: 0, tasaRecuperacion2pm: 0,
      pagos4pm: 0, ptp4pm: 0, tasaRecuperacion4pm: 0,
      pagos6pm: 0, ptp6pm: 0, tasaRecuperacion6pm: 0,
      pagosTotal: 0, tasaRecuperacionTotal: 0, casosFueraDeHorario: 0,
    };

    let totalCasosConAsesor = 0;

    casosDelDia.forEach((caso) => {
      const horaCredito = obtenerFechaMexicoISO(caso.fechaDeReembolso);
      const horaComunicacion = obtenerFechaMexicoISO(caso.fechaRegistroComunicacion);

      if (['Dispersado', 'Pagado', 'Pagado con Extensión'].includes(caso.estadoDeCredito)) {
        totalCasosConAsesor++;
        if ((['Pagado', 'Pagado con Extensión'].includes(caso.estadoDeCredito)) && (horaCredito >= 24 && horaCredito < 7)) {
          totales.casosFueraDeHorario++;
        }


        if ((['Pagado', 'Pagado con Extensión'].includes(caso.estadoDeCredito)) &&
          moment(caso.fechaDeTramitacionDeCobro).format('DD/MM/YYYY') === moment(caso.fechaDeReembolso).format('DD/MM/YYYY')) {
          if (horaCredito >= 7 && horaCredito < 10) totales.pagos10am++;
          if (horaCredito >= 10 && horaCredito < 12) totales.pagos12am++;
          if (horaCredito >= 12 && horaCredito < 14) totales.pagos2pm++;
          if (horaCredito >= 14 && horaCredito < 16) totales.pagos4pm++;
          if (horaCredito >= 16 && horaCredito < 18) totales.pagos6pm++;

          totales.pagosTotal++;
        }
      }

      if (caso.estadoDeComunicacion === 'Pagará pronto') {
        if (horaComunicacion >= 7 && horaComunicacion < 10) totales.ptp10am++;
        if (horaComunicacion >= 10 && horaComunicacion < 12) totales.ptp12am++;
        if (horaComunicacion >= 12 && horaComunicacion < 14) totales.ptp2pm++;
        if (horaComunicacion >= 14 && horaComunicacion < 16) totales.ptp4pm++;
        if (horaComunicacion >= 16 && horaComunicacion < 18) totales.ptp6pm++;
      }
    });

    totales.pagos12am += totales.pagos10am;
    totales.ptp12am += totales.ptp10am;

    totales.pagos2pm += totales.pagos12am;
    totales.ptp2pm += totales.ptp12am;

    totales.pagos4pm += totales.pagos2pm;
    totales.ptp4pm += totales.ptp2pm;

    totales.pagos6pm += totales.pagos4pm;
    totales.ptp6pm += totales.ptp4pm;

    // Calcular tasas de recuperacion
    const calcularTasa = (pagos) => (totalCasosConAsesor > 0 ? (pagos / totalCasosConAsesor) * 100 : 0);

    totales.tasaRecuperacion10am = calcularTasa(totales.pagos10am);
    totales.tasaRecuperacion12am = calcularTasa(totales.pagos12am);
    totales.tasaRecuperacion2pm = calcularTasa(totales.pagos2pm);
    totales.tasaRecuperacion4pm = calcularTasa(totales.pagos4pm);
    totales.tasaRecuperacion6pm = calcularTasa(totales.pagos6pm);
    totales.tasaRecuperacionTotal = calcularTasa(totales.pagosTotal);

    totales.totalesConAsesor = totalCasosConAsesor;

    res.json({ totales });

  } catch (error) {
    console.error('Error al obtener los datos de totales:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
};

export const getReporteTotales = async (req, res) => {
  try {
    const { fecha } = req.query;

    const fechaHoy = new Date();
    const opciones = { timeZone: 'America/Mexico_City' };

    // Obtener los valores por separado y formatearlos
    const [dia, mes, anio] = fechaHoy.toLocaleDateString('es-MX', opciones).split('/').map(num => num.padStart(2, '0'));

    const today = fecha || `${anio}-${mes}-${dia}`;

    // Solo obtener los casos "Dispersados"
    const collection = VerificationCollection;

    const casosDelDia = await collection.find({ estadoDeCredito: 'Dispersado' });

    if (casosDelDia.length === 0) {
      return res.json({
        data: {},
        message: `No se encontraron casos dispersados del día ${today}.`,
      });
    }

    const resultado = {
      D0: { casosPagados: 0, casosTotal: 0, casosFueraDeHorario: 0 },
      D1: { casosPagados: 0, casosTotal: 0, casosFueraDeHorario: 0 },
      D2: { casosPagados: 0, casosTotal: 0, casosFueraDeHorario: 0 },
      S1: { casosPagados: 0, casosTotal: 0, casosFueraDeHorario: 0 },
      S2: { casosPagados: 0, casosTotal: 0, casosFueraDeHorario: 0 }
    };

    casosDelDia.forEach((caso) => {
      const tipo = caso.cuentaCobrador || 'Desconocido';

      const fechaDeCobro = caso.fechaDeCobro ? new Date(caso.fechaDeCobro) : null;
      let diasDeMora = null;

      if (fechaDeCobro) {
        const diferenciaTiempo = fechaHoy - fechaDeCobro;
        diasDeMora = Math.floor(diferenciaTiempo / (1000 * 3600 * 24)); // Convertir a días
      }

      // Clasificar los casos según los días de mora
      if (diasDeMora !== null) {
        if (diasDeMora === 0) {
          resultado.D0.casosTotal++;
        } else if (diasDeMora === 1) {
          resultado.D1.casosTotal++;
        } else if (diasDeMora === 2) {
          resultado.D2.casosTotal++;
        } else if (diasDeMora >= 1 && diasDeMora <= 7) {
          resultado.S1.casosTotal++;
        } else if (diasDeMora >= 8 && diasDeMora <= 16) {
          resultado.S2.casosTotal++;
        }
      }

      // Verificar si el caso está fuera de horario
      const horaCredito = caso.fechaDeReembolso ? obtenerFechaMexicoISO(caso.fechaDeReembolso) : obtenerFechaMexicoISO(caso.fechaDeTramitacionDeCobro);
      if (horaCredito !== null && horaCredito >= 24 && horaCredito < 7) {
        resultado.D0.casosFueraDeHorario++; // Contar como "Fuera de horario" en D0, si corresponde
      }
    });

    res.json({ data: resultado });
  } catch (error) {
    console.error('Error al obtener los datos de reembolso:', error);
    res.status(500).json({ message: 'Error al obtener los datos' });
  }
};
