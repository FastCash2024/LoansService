export function ajustarFechaInicio(fecha) {
    // Crear un objeto Date con la fecha original
    const originalDate = new Date(fecha);

    // Establecer la hora a las 00:01 manteniendo la zona horaria
    originalDate.setHours(0, 1, 0, 0);

    // Devolver la fecha ajustada en formato string con la zona horaria original
    const offset = originalDate.getTimezoneOffset() * 60000;  // Obtener el desfase horario en milisegundos
    const fechaAjustada = new Date(originalDate - offset);  // Ajustar la fecha al desfase original

    // Crear el string con la fecha ajustada, respetando el formato local
    const fechaLocal = fechaAjustada.toISOString().slice(0, 19); // Quitar la 'Z' para mantener la zona horaria original
    const zonaHoraria = fecha.slice(-6);  // Tomar la zona horaria original

    return `${fechaLocal}${zonaHoraria}`;
}

export function obtenerFechaMexicoISO(fecha) {
    const fechaUTC = new Date(fecha);

    const horaMexico = fechaUTC.getHours();

    return horaMexico;
}

