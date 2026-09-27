const { isTransactionsUnsupported } = require('../services/economyService');
const { formatRemaining } = require('./format');

const MESSAGES = {
    work_cooldown: details => `Ya trabajaste por hoy. Volves a poder cobrar en **${formatRemaining(details.availableAt)}**.`,
    steal_cooldown: details => `Ya intentaste robar. Volves a poder intentarlo en **${formatRemaining(details.availableAt)}**.`,
    self_transfer: 'No te podés transferir monedas a vos mismo.',
    self_steal: 'No te podés robar a vos mismo.',
    invalid_amount: 'El monto tiene que ser un numero entero positivo.',
    insufficient_funds: 'No tenés suficientes monedas para eso.',
    target_empty: details => {
        const balance = details && Number.isFinite(details.balance) ? details.balance : 0;
        if (balance <= 0) return 'Ese miembro no tiene monedas: no se le puede robar nada.';
        return `A ese miembro le quedan **${balance}** monedas, no hay nada que robarle.`;
    },
    market_not_found: 'No encontré ningun mercado con ese ID.',
    market_not_open: 'Ese mercado no está abierto.',
    market_closed: 'Ese mercado ya cerró y no acepta más apuestas.',
    already_settled: 'Ese mercado ya fue liquidado o cancelado.',
    creator_cannot_resolve: 'Creaste ese mercado, no podés resolverlo. Que lo resuelva otro miembro del staff.',
    invalid_outcome: 'Esa opción no existe en el mercado.',
    outcome_locked: 'Ya apostaste en ese mercado: solo podés sumar más monedas a la misma opción.',
    min_outcomes: 'El mercado necesita al menos 2 opciones.',
    max_outcomes: 'El mercado admite como máximo 5 opciones.',
    duplicate_outcome: 'Las opciones tienen que ser distintas entre sí.',
    outcome_too_long: 'Los nombres de las opciones son demasiado largos (máximo 50 caracteres).',
    question_too_long: 'La pregunta es demasiado larga (máximo 200 caracteres).',
    description_too_long: 'La descripción es demasiado larga (máximo 1000 caracteres).',
    invalid_question: 'La pregunta no es válida.',
    invalid_close_time: 'La hora de cierre no es válida.',
    close_time_past: 'La hora de cierre tiene que estar en el futuro.',
    reason_required: 'Tenés que indicar un motivo para cancelar el mercado.',
    reason_too_long: 'El motivo es demasiado largo (máximo 300 caracteres).',
    not_staff: 'Necesitás tener un rol de staff para usar este comando.',
    not_in_guild: 'Este comando solo se puede usar dentro de un servidor.',
    credit_failed: 'No se pudieron acreditar las monedas en la cuenta del receptor. Intentá de nuevo en un momento.'
};

function describeError(err) {
    if (isTransactionsUnsupported(err)) {
        return 'La base de datos no soporta transacciones. Verificá que el servidor de MongoDB sea un replica set o una configuracion sharded.';
    }
    if (err && MESSAGES[err.code]) {
        const message = MESSAGES[err.code];
        return typeof message === 'function' ? message(err) : message;
    }
    console.error('Error en comando de economia:', err);
    return 'Ocurrió un error inesperado. Intentá de nuevo en un momento.';
}

module.exports = { describeError, MESSAGES };
