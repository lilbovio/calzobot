const config = require('../config.json');

const COIN_FORMAT = new Intl.NumberFormat('es-AR');

// Emoji de moneda del servidor. Si falta el ID en config se cae a uno unicode
// para que los embed nunca muestren "undefined" ni queden sin simbolo.
const COIN_EMOJI = config.COIN_EMOJI_ID
    ? `<:${config.COIN_EMOJI_NAME || 'coin'}:${config.COIN_EMOJI_ID}>`
    : '\u{1FA99}';

function formatCoins(value) {
    return COIN_FORMAT.format(Math.max(0, Math.floor(value || 0)));
}

function coin(value) {
    return `${COIN_EMOJI} ${formatCoins(value)}`;
}

// Barra de proportion para mostrar que parte del pool lleva cada opcion.
function shareBar(ratio, width = 14) {
    const safe = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
    const filled = Math.round(safe * width);
    return `\`${'\u2588'.repeat(filled)}${'\u2591'.repeat(width - filled)}\``;
}

function formatOdds(multiplier) {
    if (multiplier === null || multiplier === undefined || !Number.isFinite(multiplier)) return '—';
    return `${multiplier.toFixed(2)}x`;
}

function formatPercent(ratio) {
    if (!Number.isFinite(ratio)) return '—';
    return `${(ratio * 100).toFixed(1)}%`;
}

function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (!days && !hours) parts.push(`${seconds}s`);
    return parts.join(' ');
}

function formatRemaining(target) {
    if (!target) return 'ahora';
    const ms = new Date(target).getTime() - Date.now();
    if (ms <= 0) return 'ahora';
    return formatDuration(ms);
}

function timestamp(target) {
    return target ? `<t:${Math.floor(new Date(target).getTime() / 1000)}:f>` : '—';
}

function relativeTimestamp(target) {
    return target ? `<t:${Math.floor(new Date(target).getTime() / 1000)}:R>` : '—';
}

function truncate(text, max) {
    const value = String(text || '');
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(0, max - 1))}…`;
}

module.exports = {
    COIN_EMOJI,
    coin,
    shareBar,
    formatCoins,
    formatOdds,
    formatPercent,
    formatDuration,
    formatRemaining,
    timestamp,
    relativeTimestamp,
    truncate
};
