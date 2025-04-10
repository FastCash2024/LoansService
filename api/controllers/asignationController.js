import cron from "node-cron";
import moment from "moment-timezone";
import User from '../models/AuthCollection.js';
import VerificationCollection from '../models/VerificationCollection.js';

export const asignationCases = async (req, res) => {

    try {
        const { estadoDeCredito, tipoDeGrupo, situacionLaboral, nuevoEstadoDeCredito } = req.query;

        const assignCasesEqually = async () => {
            const filter = {};
            if (estadoDeCredito) {
                filter.estadoDeCredito = { $regex: estadoDeCredito, $options: "i" };
            }
            const credits = await VerificationCollection.find(filter);

            const filter2 = {};
            if (tipoDeGrupo) {
                filter2.tipoDeGrupo = { $regex: tipoDeGrupo, $options: "i" };
            }
            if (situacionLaboral) {
                filter2.situacionLaboral = { $regex: situacionLaboral, $options: "i" };
            }

            const users = await User.find(filter2);

            function dividir(a, b) {
                if (b === 0) {
                    return { error: "No se puede dividir entre 0" };
                }
                const cociente = Math.floor(a / b);
                const residuo = a % b;
                if (cociente === 0) {
                    return { error: "Toca a 0" };
                }
                return { cociente, residuo };
            }

            const { cociente } = dividir(credits.length, users.length);

            if (cociente.error) {
                return res.status(400).json({ message: cociente.error });
            }

            const updatedUsers = users.map(user => ({ ...user._doc, idCasosAsignados: [] }));
            let unassignedCases = credits.map(credit => ({ ...credit._doc }));

            updatedUsers.forEach(user => {
                if (unassignedCases.length >= cociente) {
                    user.idCasosAsignados = unassignedCases.slice(0, cociente).map(caso => caso.numeroDePrestamo);
                    unassignedCases = unassignedCases.slice(cociente);
                }
            });

            const updatedCases = credits.map(credit => ({ ...credit._doc })).map(caso => {
                const assignedUser = updatedUsers.find(user => user.idCasosAsignados.includes(caso.numeroDePrestamo));
                if (assignedUser) {
                    return { ...caso, cuentaVerificador: assignedUser.cuenta, nombreDeLaEmpresa: assignedUser.origenDeLaCuenta, estadoDeCredito: nuevoEstadoDeCredito };
                }
            }).filter(i => i !== null && i !== undefined);

            await Promise.all(
                updatedCases.map(async (i) => {
                    await VerificationCollection.findByIdAndUpdate(i._id, i, { new: true });
                })
            );
        };

        const interval = setInterval(async () => {
            try {
                await assignCasesEqually();
            } catch (error) {
                console.error("Error en la asignación:", error);
                clearInterval(interval);
            }
        }, 10000);

        res.status(200).json({ message: "Proceso de asignación iniciado" });
    } catch (error) {
        res.status(500).json({ message: "Error al iniciar el proceso.".error.message });
    }
};


// Lógica principal que hace la asignación
async function asignationCasesVerificationLogic() {
    try {
        // Aquí pones toda la lógica que ya tienes
        console.log("Asignación de casos iniciada...");

        // (Por ejemplo) buscar casos, asignar, guardar en base de datos...
        
        console.log("Asignación de casos terminada.");
    } catch (error) {
        console.error("Error dentro de la lógica de asignación:", error);
        throw error; // Lanzamos el error para que el que llama decida qué hacer
    }
}

// Función para la ruta HTTP
export const asignationCasesVerification = async (req, res) =>  {
    try {
        await asignationCasesVerificationLogic();
        res.status(200).json({ message: "Asignación realizada exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error en la asignación", error: error.message });
    }
}

// Programar la ejecucion automatica en (hora de Mexico)
cron.schedule("0 7,10,12,14,16 * * *", () => {
    console.log("Ejecutando asignación de casos...");
    asignationCasesVerificationLogic();
}, {
    timezone: "America/Mexico_City"
});

console.log("Tarea programada para ejecutarse a las 7 AM, 10 AM, 12 PM, 2 PM y 4 PM (hora de México)");
