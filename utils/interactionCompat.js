const SUB_COMMAND_GROUP = 1;
const SUB_COMMAND = 2;
const STRING = 3;
const INTEGER = 4;
const BOOLEAN = 5;
const USER = 6;
const CHANNEL = 7;
const ROLE = 8;
const MENTIONABLE = 9;
const NUMBER = 10;

const BOOLEAN_TRUE = new Set(['true', 'verdadero', 'si', 'sí', 'yes', 'y', '1', 'on']);
const BOOLEAN_FALSE = new Set(['false', 'falso', 'no', 'n', '0', 'off']);

function stripQuotes(value) {
    const trimmed = String(value ?? '').trim();
    if (trimmed.length >= 2) {
        const first = trimmed[0];
        const last = trimmed[trimmed.length - 1];
        if ((first === '"' && last === '"') || (first === "'" && last === "'")) return trimmed.slice(1, -1);
    }
    return trimmed;
}

function keyOf(token) {
    const match = /^([a-zA-Z0-9_]{1,32})\s*[:=]\s*([\s\S]*)$/.exec(token);
    return match ? { key: match[1].toLowerCase(), value: match[2] } : null;
}

function commandData(command) {
    if (!command || !command.data) return null;
    if (typeof command.data.toJSON === 'function') return command.data.toJSON();
    return command.data;
}

function resolveUser(message, raw) {
    const id = String(raw ?? '').replace(/[<@!>]/g, '').trim();
    if (!id) return null;
    return message.guild?.members?.cache?.get(id)
        || message.client?.users?.cache?.get(id)
        || { id, username: id, bot: false, tag: id };
}

function resolveSnowflake(message, raw) {
    const id = String(raw ?? '').replace(/[<@!#>]/g, '').trim();
    if (!id) return null;
    return message.guild?.channels?.cache?.get(id)
        || message.guild?.roles?.cache?.get(id)
        || { id, name: id, toString: () => `<@&${id}>` };
}

function coerce(option, raw, message) {
    if (raw === undefined) return { missing: true };

    if (option.type === STRING) {
        const value = stripQuotes(raw);
        if (!value) return { missing: true };
        if (option.choices?.length) {
            const choice = option.choices.find(item => item.value === value || item.name.toLowerCase() === value.toLowerCase());
            if (!choice) {
                return { error: `Valor inválido para \`${option.name}\`. Opciones: ${option.choices.map(item => `\`${item.name}\``).join(', ')}.` };
            }
            return { value: choice.value };
        }
        return { value };
    }

    if (option.type === INTEGER || option.type === NUMBER) {
        const number = Number(stripQuotes(raw));
        if (!Number.isFinite(number)) return { error: `\`${option.name}\` tiene que ser un número.` };
        if (option.type === INTEGER && !Number.isInteger(number)) return { error: `\`${option.name}\` tiene que ser un número entero.` };
        if (option.min_value !== undefined && option.min_value !== null && number < option.min_value) {
            return { error: `\`${option.name}\` tiene que ser ${option.min_value} o más.` };
        }
        if (option.max_value !== undefined && option.max_value !== null && number > option.max_value) {
            return { error: `\`${option.name}\` no puede superar ${option.max_value}.` };
        }
        return { value: number };
    }

    if (option.type === BOOLEAN) {
        const value = stripQuotes(raw).toLowerCase();
        if (BOOLEAN_TRUE.has(value)) return { value: true };
        if (BOOLEAN_FALSE.has(value)) return { value: false };
        return { error: `\`${option.name}\` tiene que ser verdadero o falso.` };
    }

    if (option.type === USER || option.type === MENTIONABLE) {
        const resolved = resolveUser(message, raw);
        if (!resolved) return { error: `No encontré a ese usuario para \`${option.name}\`. Usá una mención como \`<@123456789>\`.` };
        return { value: resolved };
    }

    if (option.type === CHANNEL || option.type === ROLE) {
        const resolved = resolveSnowflake(message, raw);
        if (!resolved) return { error: `No encontré ese valor para \`${option.name}\`.` };
        return { value: resolved };
    }

    return { value: stripQuotes(raw) };
}

function parseArguments(tokens, options) {
    const byName = new Map(options.map(option => [option.name.toLowerCase(), option]));
    const values = new Map();
    const unknownKeys = [];
    const endIndex = new Map();

    const assign = (option, raw, index) => {
        if (!option || values.has(option.name)) return;
        values.set(option.name, raw);
        endIndex.set(option.name, index);
    };

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        const keyed = keyOf(token);

        if (!keyed || !byName.has(keyed.key)) {
            if (keyed) unknownKeys.push(keyed.key);
            assign(options.find(option => !values.has(option.name)), token, index);
            continue;
        }

        let raw = keyed.value;
        while (index + 1 < tokens.length) {
            const nextKeyed = keyOf(tokens[index + 1]);
            if (nextKeyed && byName.has(nextKeyed.key)) break;
            index += 1;
            raw = `${raw} ${tokens[index]}`;
        }
        assign(byName.get(keyed.key), raw, index);
    }

    // La última opción de texto libre sin choices absorbe los tokens sobrantes, para que
    // `!motivo evento cancelado por error` funcione sin comillas.
    const last = options[options.length - 1];
    if (last && last.type === STRING && !last.choices?.length) {
        const consumed = endIndex.has(last.name)
            ? endIndex.get(last.name)
            : (endIndex.size ? Math.max(...endIndex.values()) : -1);
        const leftovers = tokens.slice(consumed + 1).filter(token => {
            const nextKeyed = keyOf(token);
            return !nextKeyed || !byName.has(nextKeyed.key);
        });
        if (leftovers.length) {
            const current = values.get(last.name);
            values.set(last.name, stripQuotes(current ? `${current} ${leftovers.join(' ')}` : leftovers.join(' ')));
        }
    }

    return { values, unknownKeys };
}

function buildUsage(data, options, subcommand, prefix) {
    // El shim solo parsea clave:valor, asi que la ayuda tiene que mostrar esa
    // forma: con sintaxis posicional el comando falla siempre.
    const parts = options.map(option => {
        if (option.type === SUB_COMMAND_GROUP || option.type === SUB_COMMAND) return `[${option.name}]`;
        const piece = `${option.name}:${option.type === 6 ? '<mencion>' : '<texto>'}`;
        return option.required ? piece : `[${piece}]`;
    });
    const head = `${prefix}${data.name}${subcommand ? ` ${subcommand}` : ''}`;
    return `Uso: \`${head} ${parts.join(' ')}\``;
}

function normalizePayload(payload) {
    if (typeof payload === 'string') return { content: payload };
    if (payload === null || payload === undefined) return { content: '✅ Listo.' };
    if (typeof payload !== 'object') return { content: String(payload) };
    const { flags, ephemeral, fetchReply, withResponse, ...rest } = payload;
    return rest;
}

function buildMessageInteraction(message, args = [], command, prefix = '/') {
    const data = commandData(command);
    if (!data) return { error: 'Este comando no tiene definición de slash command.' };

    const topLevel = data.options || [];
    const subcommandOptions = topLevel.filter(option => option.type === SUB_COMMAND_GROUP || option.type === SUB_COMMAND);
    const tokens = [...args];

    let subcommand = null;
    let options = topLevel;

    if (subcommandOptions.length) {
        const requested = String(tokens.shift() || '').toLowerCase();
        const group = subcommandOptions.find(option => option.name.toLowerCase() === requested);
        if (!group) {
            return {
                error: `Subcomando \`${requested || '(vacío)'}\` desconocido. Disponibles: ${subcommandOptions.map(option => `\`${option.name}\``).join(', ')}.`,
                usage: buildUsage(data, subcommandOptions, null, prefix)
            };
        }
        subcommand = group.name;
        options = group.options || [];
    }

    const { values: rawValues, unknownKeys } = parseArguments(tokens, options);
    const values = new Map();
    const missing = [];

    for (const option of options) {
        if (!rawValues.has(option.name)) {
            if (option.required) missing.push(option.name);
            continue;
        }
        const result = coerce(option, rawValues.get(option.name), message);
        if (result.error) return { error: result.error, usage: buildUsage(data, options, subcommand, prefix) };
        if (result.missing) {
            if (option.required) missing.push(option.name);
            continue;
        }
        values.set(option.name, result.value);
    }

    if (missing.length) {
        return {
            error: `Faltan argumentos obligatorios: ${missing.map(name => `\`${name}\``).join(', ')}.`,
            usage: buildUsage(data, options, subcommand, prefix)
        };
    }

    if (unknownKeys.length) {
        return {
            error: `No conozco estos argumentos: ${unknownKeys.map(key => `\`${key}\``).join(', ')}.`,
            usage: buildUsage(data, options, subcommand, prefix)
        };
    }

    const read = (name, expected) => {
        const value = values.get(name);
        if (value === undefined) return null;
        if (expected && typeof value !== expected) return null;
        return value;
    };

    const optionsApi = {
        data: options,
        getSubcommand: () => subcommand,
        getSubcommandRequired: () => subcommand,
        getString: name => read(name, 'string'),
        getInteger: name => read(name, 'number'),
        getNumber: name => read(name, 'number'),
        getBoolean: name => read(name, 'boolean'),
        getUser: name => read(name, 'object'),
        getChannel: name => read(name, 'object'),
        getRole: name => read(name, 'object'),
        getMentionable: name => read(name, 'object'),
        getAttachment: () => null
    };

    let replied = false;
    let deferred = false;

    const send = async payload => {
        const normalized = normalizePayload(payload);
        if (!replied) {
            replied = true;
            return message.reply(normalized);
        }
        return message.channel.send(normalized);
    };

    const interaction = {
        id: `prefix-${message.id}`,
        commandName: data.name,
        isChatInputCommand: () => false,
        isAutocomplete: () => false,
        inGuild: () => Boolean(message.guild),
        inCachedGuild: () => Boolean(message.guild),
        guildId: message.guild?.id ?? null,
        channelId: message.channel?.id ?? null,
        user: message.author,
        member: message.member ?? null,
        guild: message.guild ?? null,
        channel: message.channel,
        client: message.client,
        options: optionsApi,
        get replied() { return replied; },
        get deferred() { return deferred; },
        reply: send,
        async deferReply() { deferred = true; },
        async deferUpdate() { deferred = true; },
        async editReply(payload) { return message.edit(normalizePayload(payload)); },
        async followUp(payload) { return message.channel.send(normalizePayload(payload)); },
        async fetchReply() { return message; }
    };

    return { interaction, subcommand };
}

function createMessageHandler(command) {
    return async function executeMessage(message, args, client) {
        const data = commandData(command);
        const prefixService = require('../services/prefixService');
        const guildPrefix = data ? prefixService.getPrefixes(message.guild?.id)[0] : null;
        const { interaction, error, usage } = buildMessageInteraction(message, args, command, guildPrefix || '/');

        if (error) {
            await message.reply([error, usage].filter(Boolean).join('\n')).catch(() => {});
            return;
        }

        try {
            await command.execute(interaction, client || message.client);
        } catch (err) {
            console.error(`Error ejecutando ${data ? data.name : 'comando'} por prefijo:`, err);
            if (!interaction.replied) {
                await message.reply('❌ Ocurrió un error al ejecutar el comando.').catch(() => {});
            }
        }
    };
}

module.exports = { buildMessageInteraction, createMessageHandler };
