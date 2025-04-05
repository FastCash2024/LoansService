// formatear fechas en YYYYMMDD
export const formatFechaYYYYMMDD = (fecha) => {
  if (!fecha) return null;

  let date;

  if (fecha instanceof Date) {
    date = fecha;
  } else if (typeof fecha === "string") {

    date = new Date(fecha);
    if (isNaN(date)) return null;
  } else {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
};
