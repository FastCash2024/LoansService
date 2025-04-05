
export function obtenerFechaMexicoISO(fecha) {
    const fechaUTC = new Date(fecha);

    const horaMexico = fechaUTC.getHours();

    return horaMexico;
}

