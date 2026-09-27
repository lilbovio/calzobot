const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const betService = require('../../services/betService');
const { BET } = betService;
const { isStaff } = require('../../utils/permissions');
const {
    coin,
    shareBar,
    formatCoins,
    formatOdds,
    formatPercent,
    timestamp,
    relativeTimestamp,
    truncate
} = require('../../utils/format');
const { describeError, MESSAGES } = require('../../utils/economyErrors');
const Wager = require('../../models/wagerSchema');

const OUTCOME_OPTIONS = ['opcion1', 'opcion2', 'opcion3', 'opcion4', 'opcion5'];

const DURATIONS = [
    { name: '30 minutos', value: '30m' },
    { name: '1 hora', value: '1h' },
    { name: '3 horas', value: '3h' },
    { name: '6 horas', value: '6h' },
    { name: '12 horas', value: '12h' },
    { name: '1 día', value: '1d' },
    { name: '3 días', value: '3d' },
    { name: '7 días', value: '7d' },
    { name: '14 días', value: '14d' }
];

const STATUS_LABELS = {
    open: '🟢 Abierto',
    closed: '🟡 Cerrado',
    settled: '✅ Liquidado',
    cancelled: '❌ Cancelado'
};

const STATUS_COLORS = {
    open: 0x57f287,
    closed: 0xfee75c,
    settled: 0x5865f2,
    cancelled: 0xed4245
};

const DURATION_UNITS = { m: 60000, h: 3600000, d: 86400000 };

function durationToMs(value) {
    const match = /^(\d{1,3})([mhd])$/.exec(String(value || ''));
    if (!match) return null;
    return Number(match[1]) * DURATION_UNITS[match[2]];
}

function buildMarketEmbed(market, pools, viewerWager = null) {
    const totalPool = pools ? pools.totalPool : 0;
    const totalBets = pools
        ? [...pools.pools.values()].reduce((acc, entry) => acc + entry.bettors, 0)
        : 0;

    const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS[market.status] || 0x2f3136)
        .setTitle(truncate(market.question, 256))
        .setDescription(market.description
            ? truncate(market.description, 1000)
            : '_Sin reglas adicionales._')
        .addFields(
            { name: 'Estado', value: STATUS_LABELS[market.status] || market.status, inline: true },
            { name: 'Cierra', value: relativeTimestamp(market.closesAt), inline: true },
            { name: 'Total apostado', value: coin(totalPool), inline: true },
            { name: 'ID del mercado', value: `\`${market.marketId}\``, inline: true },
            { name: 'Apuestas', value: `${totalBets}`, inline: true },
            { name: 'Cierre absoluto', value: timestamp(market.closesAt), inline: true }
        );

    // Una caja por opcion: cada una lleva su barra de participacion para poder
    // comparar de un vistazo quien va ganando, sin leer un bloque de texto.
    market.outcomes.forEach((outcome, index) => {
        const data = pools ? pools.pools.get(outcome.id) : null;
        const total = data ? data.total : 0;
        const bettors = data ? data.bettors : 0;
        const share = totalPool > 0 ? total / totalPool : 0;
        const multiplier = betService.estimatePayout(1, total, totalPool - total);
        const isMine = !!viewerWager && viewerWager.outcomeId === outcome.id;

        embed.addFields({
            name: `${String(index + 1).padStart(2, '0')} \u00b7 ${truncate(outcome.label, 220)}${isMine ? ' \u25c4 tu apuesta' : ''}`,
            value: [
                `${coin(total)} \u00b7 ${bettors} ${bettors === 1 ? 'apuesta' : 'apuestas'} \u00b7 **${formatPercent(share)}** del pool`,
                shareBar(share),
                `Cuota estimada: **${formatOdds(multiplier)}**`
            ].join('\n'),
            inline: false
        });
    });

    if (viewerWager) {
        const ownTotal = pools ? (pools.pools.get(viewerWager.outcomeId)?.total || 0) : 0;
        const projected = betService.estimatePayout(viewerWager.stake, ownTotal, totalPool - ownTotal);
        const label = market.outcomes.find(o => o.id === viewerWager.outcomeId)?.label || viewerWager.outcomeId;
        embed.addFields({
            name: '\u{1F4B0} Tu posición',
            value: [
                `Apostaste **${coin(viewerWager.stake)}** a **${truncate(label, 100)}**`,
                `Si sale esa opción: **${coin(projected || 0)}** (${formatOdds((projected || 0) / viewerWager.stake)})`,
                market.status === 'settled' && market.settlement
                    ? (market.winningOutcomeId === viewerWager.outcomeId
                        ? '\u2705 Ganaste este mercado.'
                        : '\u274C No ganaste este mercado.')
                    : '_Las cuotas son estimaciones y cambian con cada apuesta._'
            ].join('\n'),
            inline: false
        });
    }

    if (market.status === 'settled' && market.settlement) {
        embed.addFields({
            name: 'Liquidación',
            value: [
                `Ganó: **${market.outcomes.find(o => o.id === market.winningOutcomeId)?.label || market.winningOutcomeId}**`,
                `Pool ganador: ${coin(market.settlement.winningPool)}`,
                `Pool perdedor: ${coin(market.settlement.losingPool)}`,
                `Comisión (${formatPercent(market.settlement.feeRate)}): ${coin(market.settlement.feeAmount)}`,
                `Pagado: ${coin(market.settlement.payoutTotal)} a ${market.settlement.winnersCount} ganadores`
            ].join('\n'),
            inline: false
        });
    }

    if (market.status === 'cancelled' && market.cancellationReason) {
        embed.addFields({ name: 'Motivo de cancelación', value: truncate(market.cancellationReason, 1024) });
    }

    if (market.creatorId) embed.setFooter({ text: `Creado por <@${market.creatorId}> \u00b7 Comisión ${formatPercent(BET.feeRate)}` });

    return embed;
}

function findOutcome(market, value) {
    const input = String(value || '').trim();
    return market.outcomes.find(outcome => outcome.id.toLowerCase() === input.toLowerCase())
        || market.outcomes.find(outcome => outcome.label.toLowerCase() === input.toLowerCase());
}

async function autocomplete(interaction) {
    if (!interaction.inGuild()) return interaction.respond([]);

    const focused = interaction.options.getFocused(true);
    const subcommand = interaction.options.getSubcommand();

    try {
        if (focused.name === 'id') {
            const estados = interaction.options.getString('estado');
            let statuses = ['open', 'closed'];
            if (subcommand === 'view') statuses = estados === 'activas' ? ['open', 'closed'] : undefined;
            const markets = await betService.searchMarkets(interaction.guildId, focused.value, { statuses });
            return interaction.respond(markets.map(market => ({
                name: `${market.marketId} · ${truncate(market.question, 80)}`,
                value: market.marketId
            })));
        }

        if (focused.name === 'resultado' || focused.name === 'opcion') {
            const marketId = interaction.options.getString('id');
            if (!marketId) return interaction.respond([]);
            const market = await betService.getMarket(interaction.guildId, marketId);
            if (!market) return interaction.respond([]);
            return interaction.respond(market.outcomes.map(outcome => ({
                name: truncate(outcome.label, 100),
                value: outcome.id
            })));
        }

        return interaction.respond([]);
    } catch (err) {
        console.error('Error en autocomplete de /bet:', err);
        return interaction.respond([]);
    }
}

async function handleCreate(interaction) {
    if (!isStaff(interaction)) {
        return interaction.reply({ content: `❌ ${MESSAGES.not_staff}`, flags: [64] });
    }

    const question = interaction.options.getString('pregunta');
    const description = interaction.options.getString('descripcion') || '';
    const durationMs = durationToMs(interaction.options.getString('duracion'));
    if (!durationMs) {
        return interaction.reply({ content: '❌ Duración inválida.', flags: [64] });
    }

    const outcomeLabels = OUTCOME_OPTIONS
        .map(name => interaction.options.getString(name))
        .filter(value => value !== null && value.trim().length > 0);

    const closesAt = new Date(Date.now() + durationMs);
    const market = await betService.createMarket({
        guildId: interaction.guildId,
        creatorId: interaction.user.id,
        question,
        description,
        outcomeLabels,
        closesAt
    });

    // Un mercado recien creado no tiene apuestas, asi que no se consulta el pool:
    // ahorra una ida a la base dentro del plazo de 3 s de Discord.
    const embed = buildMarketEmbed(market, { pools: new Map(), totalPool: 0 });
    embed.setFooter({ text: `Creado por <@${interaction.user.id}> \u00b7 Compartí el \`${market.marketId}\` para que los miembros puedan apostar` });

    return interaction.reply({ content: '\u2705 Mercado creado.', embeds: [embed] });
}

async function handleList(interaction) {
    const markets = await betService.listMarkets(interaction.guildId, { statuses: ['open', 'closed'], limit: 10 });

    if (!markets.length) {
        return interaction.reply({ content: '\u{1F4DA} No hay mercados abiertos en este momento.', flags: [64] });
    }

    const poolsByMarket = await betService.getPoolsForMarkets(interaction.guildId, markets.map(market => market.marketId));
    const shown = markets.slice(0, 5);

    // Un embed compacto por mercado: escaneables de un vistazo y sin truncar
    // la lista en un solo bloque de texto larguisimo.
    const embeds = shown.map(market => {
        const { totalPool = 0 } = poolsByMarket.get(market.marketId) || {};
        return new EmbedBuilder()
            .setColor(STATUS_COLORS[market.status])
            .setTitle(truncate(market.question, 256))
            .addFields(
                { name: 'ID', value: `\`${market.marketId}\``, inline: true },
                { name: 'Total apostado', value: coin(totalPool), inline: true },
                { name: 'Estado', value: STATUS_LABELS[market.status] || market.status, inline: true },
                {
                    name: `Opciones (${market.outcomes.length})`,
                    value: truncate(market.outcomes.map((o, i) => `${i + 1}. ${o.label}`).join('\n'), 1024),
                    inline: false
                }
            )
            .setFooter({ text: market.status === 'open' ? `Cierra ${relativeTimestamp(market.closesAt)}` : 'Cerrado, esperando resultado' });
    });

    const hidden = markets.length - shown.length;
    return interaction.reply({
        content: hidden > 0 ? `Mostrando ${shown.length} de ${markets.length} mercados.` : null,
        embeds,
        flags: [64]
    });
}

async function handleView(interaction) {
    const marketId = interaction.options.getString('id');
    const market = await betService.getMarket(interaction.guildId, marketId);
    if (!market) throw new betService.EconomyError('market_not_found');

    const estados = interaction.options.getString('estado');
    if (estados === 'activas' && !['open', 'closed'].includes(market.status)) {
        throw new betService.EconomyError('market_not_open');
    }

    const pools = await betService.getPools(interaction.guildId, market.marketId);
    const viewerWager = await Wager.findOne({ guildId: interaction.guildId, marketId: market.marketId, userId: interaction.user.id });
    const embed = buildMarketEmbed(market, pools, viewerWager);

    return interaction.reply({ embeds: [embed], flags: [64] });
}

async function handleWager(interaction) {
    const marketId = interaction.options.getString('id');
    const outcomeInput = interaction.options.getString('opcion');
    const amount = interaction.options.getInteger('monto');

    const market = await betService.getMarket(interaction.guildId, marketId);
    if (!market) throw new betService.EconomyError('market_not_found');

    const outcome = findOutcome(market, outcomeInput);
    if (!outcome) throw new betService.EconomyError('invalid_outcome');

    const result = await betService.placeWager({
        guildId: interaction.guildId,
        marketId: market.marketId,
        userId: interaction.user.id,
        outcomeId: outcome.id,
        amount,
        reference: interaction.id
    });

    const pools = await betService.getPools(interaction.guildId, market.marketId);
    const ownTotal = pools.pools.get(outcome.id)?.total || 0;
    const estimated = betService.estimatePayout(result.wager.stake, ownTotal, pools.totalPool - ownTotal);
    const newShare = pools.totalPool > 0 ? ownTotal / pools.totalPool : 0;

    const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('\u{1F3B2} Apuesta registrada')
        .setDescription(`Apostaste **${coin(amount)}** a **${truncate(outcome.label, 200)}** en \`${market.marketId}\`.`)
        .addFields(
            { name: 'Tu saldo', value: coin(result.balance), inline: true },
            { name: 'Total en esa opción', value: coin(result.wager.stake), inline: true },
            { name: 'Pago estimado', value: `${coin(estimated || 0)}\n${formatOdds((estimated || 0) / result.wager.stake)}`, inline: true },
            { name: 'ID del mercado', value: `\`${market.marketId}\``, inline: true },
            { name: 'Cierra', value: relativeTimestamp(market.closesAt), inline: true },
            { name: 'Reparto actual', value: `${shareBar(newShare)}\n**${outcome.label}** concentra **${formatPercent(newShare)}** del pool de ${coin(pools.totalPool)}`, inline: false }
        )
        .setFooter({ text: 'Las cuotas son estimaciones y cambian con cada apuesta.' });

    return interaction.reply({ embeds: [embed], flags: [64] });
}

async function handleClose(interaction) {
    if (!isStaff(interaction)) {
        return interaction.reply({ content: `❌ ${MESSAGES.not_staff}`, flags: [64] });
    }

    const result = await betService.closeMarket({
        guildId: interaction.guildId,
        marketId: interaction.options.getString('id'),
        staffId: interaction.user.id
    });

    const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS.closed)
        .setTitle('\u{1F512} Mercado cerrado')
        .setDescription(`\`${result.market.marketId}\` ya no acepta apuestas.`)
        .addFields(
            { name: 'Total apostado', value: coin(result.totalPool), inline: true },
            { name: 'Pregunta', value: truncate(result.market.question, 256), inline: false }
        )
        .setFooter({ text: 'Cuando tenga el resultado, un staff lo liquida con /bet resolve.' });

    return interaction.reply({ embeds: [embed] });
}

async function handleResolve(interaction) {
    if (!isStaff(interaction)) {
        return interaction.reply({ content: `❌ ${MESSAGES.not_staff}`, flags: [64] });
    }

    const marketId = interaction.options.getString('id');
    const market = await betService.getMarket(interaction.guildId, marketId);
    if (!market) throw new betService.EconomyError('market_not_found');

    const outcome = findOutcome(market, interaction.options.getString('resultado'));
    if (!outcome) throw new betService.EconomyError('invalid_outcome');

    const result = await betService.resolveMarket({
        guildId: interaction.guildId,
        marketId: market.marketId,
        outcomeId: outcome.id,
        staffId: interaction.user.id
    });

    if (result.refunded) {
        const reason = result.reason === 'no_winning_wagers'
            ? 'Nadie había apostado a la opción ganadora, así que se devolvieron todas las apuestas.'
            : 'Todas las apuestas estaban en una sola opción, así que se devolvieron sin cobrar comisión.';
        const embed = new EmbedBuilder()
            .setColor(STATUS_COLORS.cancelled)
            .setTitle('\u21A9 Mercado reembolsado')
            .setDescription(`No se liquidaron ganancias: ${reason}`)
            .addFields(
                { name: 'Mercado', value: `\`${result.market.marketId}\``, inline: true },
                { name: 'Devuelto', value: `${coin(result.refundedTotal)}\na ${result.refundsCount} miembros`, inline: true },
                { name: 'Pregunta', value: truncate(result.market.question, 256), inline: false }
            );
        return interaction.reply({ embeds: [embed] });
    }

    const settlement = result.settlement;
    const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS.settled)
        .setTitle('\u{1F3C6} Mercado liquidado')
        .setDescription(`Ganó **${truncate(outcome.label, 200)}** en \`${market.marketId}\`.`)
        .addFields(
            { name: 'Pool ganador', value: coin(settlement.winningPool), inline: true },
            { name: 'Pool perdedor', value: coin(settlement.losingPool), inline: true },
            { name: `Comisión ${formatPercent(settlement.feeRate)}`, value: coin(settlement.feeAmount), inline: true },
            { name: 'Pagado', value: `${coin(settlement.payoutTotal)}\na ${settlement.winnersCount} ganadores`, inline: true },
            { name: 'Pregunta', value: truncate(market.question, 256), inline: false }
        );

    return interaction.reply({ embeds: [embed] });
}

async function handleCancel(interaction) {
    if (!isStaff(interaction)) {
        return interaction.reply({ content: `❌ ${MESSAGES.not_staff}`, flags: [64] });
    }

    const result = await betService.cancelMarket({
        guildId: interaction.guildId,
        marketId: interaction.options.getString('id'),
        staffId: interaction.user.id,
        reason: interaction.options.getString('motivo')
    });

    const embed = new EmbedBuilder()
        .setColor(STATUS_COLORS.cancelled)
        .setTitle('\u{1F5D1} Mercado cancelado')
        .setDescription(`\`${result.market.marketId}\` fue cancelado y todas las apuestas fueron devueltas.`)
        .addFields(
            { name: 'Motivo', value: truncate(result.market.cancellationReason, 1024), inline: false },
            { name: 'Devuelto', value: `${coin(result.refundedTotal)}\na ${result.refundsCount} miembros`, inline: true },
            { name: 'Pregunta', value: truncate(result.market.question, 256), inline: false }
        );

    return interaction.reply({ embeds: [embed] });
}

const HANDLERS = {
    create: handleCreate,
    list: handleList,
    view: handleView,
    wager: handleWager,
    close: handleClose,
    resolve: handleResolve,
    cancel: handleCancel
};

module.exports = {
    __test: { buildMarketEmbed, durationToMs, findOutcome },
    data: new SlashCommandBuilder()
        .setName('bet')
        .setDescription('Mercados de apuestas entre miembros con monedas virtuales.')
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription('Crea un mercado nuevo (solo staff).')
            .addStringOption(option => option
                .setName('pregunta')
                .setDescription('Qué se está prediciendo. Ej: ¿Quién gana, Lakers o Knicks?')
                .setMinLength(2)
                .setMaxLength(BET.maxQuestionLength)
                .setRequired(true))
            .addStringOption(option => option
                .setName('opcion1')
                .setDescription('Primera opción (obligatoria).')
                .setMinLength(1)
                .setMaxLength(BET.maxOutcomeLength)
                .setRequired(true))
            .addStringOption(option => option
                .setName('opcion2')
                .setDescription('Segunda opción (obligatoria).')
                .setMinLength(1)
                .setMaxLength(BET.maxOutcomeLength)
                .setRequired(true))
            .addStringOption(option => option
                .setName('duracion')
                .setDescription('Cuánto tiempo acepta apuestas.')
                .addChoices(...DURATIONS)
                .setRequired(true))
            .addStringOption(option => option
                .setName('opcion3')
                .setDescription('Tercera opción, opcional (por ejemplo: Empate).')
                .setMinLength(1)
                .setMaxLength(BET.maxOutcomeLength)
                .setRequired(false))
            .addStringOption(option => option
                .setName('opcion4')
                .setDescription('Cuarta opción, opcional.')
                .setMinLength(1)
                .setMaxLength(BET.maxOutcomeLength)
                .setRequired(false))
            .addStringOption(option => option
                .setName('opcion5')
                .setDescription('Quinta opción, opcional.')
                .setMinLength(1)
                .setMaxLength(BET.maxOutcomeLength)
                .setRequired(false))
            .addStringOption(option => option
                .setName('descripcion')
                .setDescription('Reglas o aclaraciones de qué cuenta como resultado.')
                .setMaxLength(BET.maxDescriptionLength)
                .setRequired(false)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Muestra los mercados activos.'))
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Muestra el detalle de un mercado y las cuotas estimadas.')
            .addStringOption(option => option
                .setName('id')
                .setDescription('ID del mercado.')
                .setAutocomplete(true)
                .setRequired(true))
            .addStringOption(option => option
                .setName('estado')
                .setDescription('Si incluir mercados ya liquidados o cancelados.')
                .addChoices(
                    { name: 'Solo activos', value: 'activas' },
                    { name: 'Incluir historial', value: 'todas' }
                )
                .setRequired(false)))
        .addSubcommand(sub => sub
            .setName('wager')
            .setDescription('Apostá monedas a una opción de un mercado.')
            .addStringOption(option => option
                .setName('id')
                .setDescription('ID del mercado.')
                .setAutocomplete(true)
                .setRequired(true))
            .addStringOption(option => option
                .setName('opcion')
                .setDescription('Opción a la que apostás. Podés sumar más monedas a la misma.')
                .setAutocomplete(true)
                .setRequired(true))
            .addIntegerOption(option => option
                .setName('monto')
                .setDescription('Cantidad de monedas a apostar.')
                .setMinValue(BET.minStake)
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('close')
            .setDescription('Cierra un mercado antes de tiempo (solo staff).')
            .addStringOption(option => option
                .setName('id')
                .setDescription('ID del mercado.')
                .setAutocomplete(true)
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('resolve')
            .setDescription('Liquida el mercado eligiendo la opción ganadora (solo staff).')
            .addStringOption(option => option
                .setName('id')
                .setDescription('ID del mercado.')
                .setAutocomplete(true)
                .setRequired(true))
            .addStringOption(option => option
                .setName('resultado')
                .setDescription('Opción ganadora.')
                .setAutocomplete(true)
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('cancel')
            .setDescription('Cancela un mercado y devuelve todas las apuestas (solo staff).')
            .addStringOption(option => option
                .setName('id')
                .setDescription('ID del mercado.')
                .setAutocomplete(true)
                .setRequired(true))
            .addStringOption(option => option
                .setName('motivo')
                .setDescription('Motivo de la cancelación.')
                .setMinLength(3)
                .setMaxLength(BET.maxReasonLength)
                .setRequired(true))),

    autocomplete,

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: `❌ ${MESSAGES.not_in_guild}`, flags: [64] });
        }

        const handler = HANDLERS[interaction.options.getSubcommand()];
        if (!handler) {
            return interaction.reply({ content: '❌ Subcomando desconocido.', flags: [64] });
        }

        try {
            return await handler(interaction);
        } catch (err) {
            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ content: `❌ ${describeError(err)}`, flags: [64] });
            }
            return interaction.reply({ content: `❌ ${describeError(err)}`, flags: [64] });
        }
    }
};
