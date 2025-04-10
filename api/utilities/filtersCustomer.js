import moment from "moment";

export const calculateDynamicDateRange = () => {
    const today = moment(); // Fecha actual

    // Ajustar la fecha de inicio (viernes anterior)
    const startOfRange = today.clone().startOf('week').subtract(1, 'days'); // Empieza desde el viernes de la semana pasada
    const endOfRange = today.clone().endOf('week').subtract(2, 'days'); // Termina en jueves de esta semana

    return {
        startOfRange: startOfRange.format('YYYY-MM-DD'), // Formato para guardar en la base de datos
        endOfRange: endOfRange.format('YYYY-MM-DD') // Formato para guardar en la base de datos
    };
};

// Función para calcular el rango de fechas de acuerdo a la semana especificada
export const calculateDateRangeForWeek = (weekNumber) => {
    const startOfYear = moment().startOf('year'); // Iniciar desde el primer día del año
    const startOfWeek = startOfYear.week(weekNumber).startOf('week'); // Calculamos el lunes de la semana
    const endOfWeek = startOfWeek.clone().endOf('week'); // Y calculamos el domingo de la misma semana
    return { startOfWeek, endOfWeek };
};