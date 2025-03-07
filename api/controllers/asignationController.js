import User from '../models/AuthCollection.js';
import VerificationCollection from '../models/VerificationCollection.js';

export const asignationCases = async (req, res) => {

    try {
        const { estadoDeCredito, tipoDeGrupo, situacionLaboral, nuevoEstadoDeCredito } = req.query;

        const assignCasesEqually = async () => {
            // Construcción dinámica del filtro casos
            const filter = {};
            if (estadoDeCredito) {
                filter.estadoDeCredito = { $regex: estadoDeCredito, $options: "i" };
            }
            const credits = await VerificationCollection.find(filter);

            // Construcción dinámica del filtro usuarios
            const filter2 = {};
            if (tipoDeGrupo) {
                filter2.tipoDeGrupo = { $regex: tipoDeGrupo, $options: "i" };
            }
            if (situacionLaboral) {
                filter2.situacionLaboral = { $regex: situacionLaboral, $options: "i" };
            }

            const users = await User.find(filter2);

            // División para repartición igualitaria máxima
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

            // Asignación igualitaria
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

        // Bucle de ejecución controlado (Ejemplo: Ejecutar cada 10 segundos)
        const interval = setInterval(async () => {
            try {
                await assignCasesEqually();
            } catch (error) {
                console.error("Error en la asignación:", error);
                clearInterval(interval); // Detener el bucle si ocurre un error crítico
            }
        }, 10000); // 10 segundos

        res.status(200).json({ message: "Proceso de asignación iniciado" });
    } catch (error) {
        res.status(500).json({ message: "Error al iniciar el proceso.". error.message });
    }
};


