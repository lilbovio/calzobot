const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_auditory_channel')
        .setDescription('Establece el canal en el que se enviaran los registros de auditoria.')
        .addChannelOption(option =>
            option.setName("canal")
                .setDescription("Canal donde se enviaran los registros de auditoria")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: '❌ Este comando solo se puede usar en un servidor.', flags: [64] });
        }

        const channel = interaction.options.getChannel("canal");
        const permisos = channel.permissionsFor(interaction.guild.members.me);
        if (!permisos?.has(['ViewChannel', 'SendMessages'])) {
            return interaction.reply({ content: '❌ No puedo enviar mensajes a ese canal. Revisá mis permisos ahí.', flags: [64] });
        }

        try {
            // Antes usaba '../../config.json', que se resuelve contra el cwd del
            // proceso y no contra este archivo: por eso nunca se guardaba.
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            config.AUDITORY_CHANNEL_ID = channel.id;
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), 'utf8');
        } catch (err) {
            console.error('No se pudo actualizar config.json:', err);
            return interaction.reply({ content: '❌ No se pudo cambiar el canal para los logs. Revisá permisos de escritura en el archivo config.json.', flags: [64] });
        }

        return interaction.reply({ content: `🏓 Configuración actualizada. Los registros de auditoría van a ir a ${channel}.`, flags: [64] });
    }
};
