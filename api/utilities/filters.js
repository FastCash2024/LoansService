import moment from "moment";

export const aplicarFiltroFecha = (filter, campo, valor) => {
    if (!valor) return;
  
    const fechas = valor.split(",").map(f => f.trim());
  
    if (fechas.length === 2) {
      const fechaInicio = moment(fechas[0]).startOf("day").toISOString();
      const fechaFin = moment(fechas[1]).endOf("day").toISOString();
      filter[campo] = { $gte: fechaInicio, $lte: fechaFin };
    } else {
      const fechaInicio = moment(valor).startOf("day").toISOString();
      const fechaFin = moment(valor).endOf("day").toISOString();
      filter[campo] = { $gte: fechaInicio, $lte: fechaFin };
    }
  };