const config = require('../config.json');

function isStaff(interaction) {
    const member = interaction.member;
    if (!member) return false;
    if (member.id === config.OWNER_ID) return true;

    const roles = member.roles;
    if (!roles) return false;

    if (Array.isArray(roles)) return roles.some(id => config.MOD_ROLES.includes(id));
    if (roles.cache) return roles.cache.some(role => config.MOD_ROLES.includes(role.id));

    return false;
}

function requireStaff(interaction) {
    if (isStaff(interaction)) return true;
    throw new Error('not_staff');
}

module.exports = { isStaff, requireStaff };
