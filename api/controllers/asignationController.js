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


export const asignationCasesVerification = async (req, res) => {
    try {
        const estadoDeCredito = "Pendiente";
        const today = moment().tz("America/Mexico_City").startOf("day");

        const credits = await VerificationCollection.find({
            estadoDeCredito: { $regex: estadoDeCredito, $options: "i" }
        });

        const filteredCredits = credits.filter(caso => {
            if (!caso.fechaDeTramitacionDelCaso) return true;
            const caseDate = moment(caso.fechaDeTramitacionDelCaso).tz("America/Mexico_City").startOf("day");
            return caseDate.isBefore(today);
        });

        const users = await User.find({ tipoDeGrupo: "Asesor de Verificación" });

        if (users.length === 0) {
            return res.status(400).json({ message: "No hay verificadores disponibles" });
        }

        let caseIndex = 0;
        while (caseIndex < filteredCredits.length) {
            for (let i = 0; i < users.length && caseIndex < filteredCredits.length; i++) {
                filteredCredits[caseIndex].cuentaVerificador = users[i].cuenta;
                filteredCredits[caseIndex].nombreDeLaEmpresa = users[i].origenDeLaCuenta;
                filteredCredits[caseIndex].fechaDeTramitacionDelCaso = moment().tz("America/Mexico_City").format();
                caseIndex++;
            }
        }

        await Promise.all(
            filteredCredits.map(async (caso) => {
                await VerificationCollection.findByIdAndUpdate(caso._id, caso, { new: true });
            })
        );

        return res.status(200).json({ message: "Casos asignados correctamente" });

    } catch (error) {
        console.error("Error en la asignación", error.message);
        return res.status(500).json({ message: "Error en la asignación", error: error.message });
    }
};

export const assignCasesBySegment = async (req, res) => {
    try {
        const estadoDeCredito = "Dispersado";
        const today = moment().tz("America/Mexico_City");

        const users = await User.find({ tipoDeGrupo: "Asesor de Cobranza" });

        if (users.length === 0) {
            return res.status(400).json({ message: "No hay cobradores disponibles" });
        }

        const cases = await VerificationCollection.find({
            estadoDeCredito: { $regex: estadoDeCredito, $options: "i" }
        });

        const casosPorSegmento = { D0: [], D1: [], D2: [], S1: [], S2: [] };
        const fechaActual = today.toDate();

        cases.forEach(caso => {
            if (!caso.fechaDeDispersion) return;

            const fechaDispersion = moment(caso.fechaDeDispersion).tz("America/Mexico_City").toDate();
            const diferenciaDiasDispersion = Math.round((fechaActual - fechaDispersion) / (1000 * 60 * 60 * 24));

            if (diferenciaDiasDispersion < 7) {
                console.log(`El caso ${caso.numeroDePrestamo} aún no cumple con los 7 días de dispersión.`);
                return;
            }

            if (diferenciaDiasDispersion === 7) {
                casosPorSegmento.D0.push(caso);
            } else if (diferenciaDiasDispersion === 6) {
                casosPorSegmento.D1.push(caso);
            } else if (diferenciaDiasDispersion === 5) {
                casosPorSegmento.D2.push(caso);
            } else if (diferenciaDiasDispersion > 7 && diferenciaDiasDispersion < 15) {
                casosPorSegmento.S1.push(caso);
            } else if (diferenciaDiasDispersion > 14 && diferenciaDiasDispersion <= 22) {
                casosPorSegmento.S2.push(caso);
            }
        });

        Object.keys(casosPorSegmento).forEach(segmento => {
            const cobradoresDeSegmento = users.filter(user => user.cuenta.includes(`${segmento}-`));

            if (casosPorSegmento[segmento].length > 0 && cobradoresDeSegmento.length > 0) {
                assignCasesTotally(casosPorSegmento[segmento], segmento, cobradoresDeSegmento);
            }
        });

        console.log("Distribución de casos completada.");
        return res.status(200).json({ message: "Casos distribuidos correctamente" });

    } catch (error) {
        console.error("Error en la distribución de casos", error.message);
        return res.status(500).json({ message: "Error en la distribución de casos", error: error.message });
    }
};

const assignCasesTotally = (cases, segment, users) => {
    const totalCases = cases.length;
    const totalUsers = users.length;
    let caseIndex = 0;
    const casesPerUser = Math.floor(totalCases / totalUsers);
    let extraCases = totalCases % totalUsers;

    while (caseIndex < totalCases) {
        for (let i = 0; i < users.length && caseIndex < totalCases; i++) {
            const user = users[i];
            const userCases = casesPerUser + (extraCases > 0 ? 1 : 0); 
            for (let j = 0; j < userCases && caseIndex < totalCases; j++) {
                cases[caseIndex].cuentaCobrador = user.cuenta;
                cases[caseIndex].nombreDeLaEmpresa = users.origenDeLaCuenta;
                cases[caseIndex].fechaDeTramitacionDelCobro = moment().tz("America/Mexico_City").format();
                caseIndex++;
            }
            if (extraCases > 0) extraCases--;
        }
    }

    Promise.all(
        cases.map(async (caso) => {
            await VerificationCollection.findByIdAndUpdate(caso._id, caso, { new: true });
        })
    );
};


// Programar la ejecucion automatica en (hora de Mexico)
cron.schedule("0 7,10,12,14,16 * * *", () => {
    console.log("Ejecutando asignación de casos...");
    asignationCasesVerification();
    assignCasesBySegment();
}, {
    timezone: "America/Mexico_City"
});

console.log("Tarea programada para ejecutarse a las 7 AM, 10 AM, 12 PM, 2 PM y 4 PM (hora de México)");
