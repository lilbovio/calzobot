require('dotenv').config();

const requiredEnvVars = ['DISCORD_TOKEN', 'MONGO_URI', 'YOUTUBE_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(name =>
    !process.env[name] || process.env[name].startsWith('replace_with_')
);
if (missingEnvVars.length) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = {
    ...require('./config.json'),
    TOKEN: process.env.DISCORD_TOKEN,
    MONGO_URI: process.env.MONGO_URI
};

const loadEvents = require('./handlers/eventHandler.js');
const { Partials } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
    //partials: [Partials.Message]
});

client.commands = new Collection();
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        let raw;
        try {
            raw = require(filePath);
        } catch (err) {
            console.error('Error require comando:', filePath, err);
            continue;
        }
        console.log('Comandos cargados:', [...client.commands.keys()]); // <-- línea nueva

        // Helper para crear data por defecto si hace falta
        const defaultData = (name) => new SlashCommandBuilder().setName(name.toLowerCase()).setDescription('Comando generado automáticamente');

        let command = raw;

        // Si el módulo exporta una función (estilo legacy)
        if (typeof raw === 'function') {
            const name = path.basename(file, '.js').toLowerCase();
            command = {
                data: defaultData(name),
                execute: async (interaction, client) => {
                    const fakeMessage = {
                        author: interaction.user,
                        member: interaction.member,
                        channel: interaction.channel,
                        guild: interaction.guild,
                        client,
                        reply: (content) => {
                            if (typeof content === 'string') return interaction.reply({ content }).catch(()=>{});
                            return interaction.reply(content).catch(()=>{});
                        }
                    };
                    try {
                        await raw(fakeMessage, [], client);
                    } catch (err) {
                        console.error(`Error executing legacy command ${name} (slash):`, err);
                        if (!interaction.replied) await interaction.reply({ content: '❌ Error al ejecutar el comando.', ephemeral: true }).catch(()=>{});
                    }
                },
                executeMessage: async (message, args, client) => {
                    try {
                        await raw(message, args, client);
                    } catch (err) {
                        console.error(`Error executing legacy command ${name} (message):`, err);
                        try { await message.reply('❌ Ocurrió un error al ejecutar el comando.'); } catch (e) {}
                    }
                }
            };
        } else {
            // Asegura que exista data para registro de slash commands
            if (!raw.data) {
                const name = (raw.name || path.basename(file, '.js')).toLowerCase();
                raw.data = defaultData(name);
            }

            // Si solo tiene executeMessage, crea wrapper para interaction
            if (!raw.execute && typeof raw.executeMessage === 'function') {
                raw.execute = async (interaction, client) => {
                    const fakeMessage = {
                        author: interaction.user,
                        member: interaction.member,
                        channel: interaction.channel,
                        guild: interaction.guild,
                        client,
                        reply: (content) => {
                            if (typeof content === 'string') return interaction.reply({ content }).catch(()=>{});
                            return interaction.reply(content).catch(()=>{});
                        }
                    };
                    try {
                        await raw.executeMessage(fakeMessage, [], client);
                    } catch (err) {
                        console.error(`Error executing command ${raw.data.name} (slash wrapper):`, err);
                        if (!interaction.replied) await interaction.reply({ content: '❌ Error al ejecutar el comando.', ephemeral: true }).catch(()=>{});
                    }
                };
            }

            // Si tiene execute pero no executeMessage, crea wrapper para mensajes
            if (!raw.executeMessage && typeof raw.execute === 'function') {
                raw.executeMessage = async (message, args, client) => {
                    try {
                        // Intentar distintas firmas comunes
                        await raw.execute(message, args, client);
                    } catch (err) {
                        try {
                            await raw.execute(message, client, args);
                        } catch (err2) {
                            console.error(`Error executing command ${raw.data.name} (message wrapper):`, err2);
                            try { await message.reply('❌ Ocurrió un error al ejecutar el comando.'); } catch (e) {}
                        }
                    }
                };
            }

            command = raw;
        }

        // Registro final en la colección y en el array de registro REST
        try {
            const commandName = command.data && command.data.name ? command.data.name : path.basename(file, '.js').toLowerCase();
            client.commands.set(commandName, command);
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
            }
        } catch (err) {
            console.error('Error al registrar comando desde archivo', filePath, err);
        }
    }
}

// Cargar eventos
loadEvents(client);

client.once('ready', async () => {
    console.log(`✅ Bot iniciado como ${client.user.tag}`);
    const logChannel = client.channels.cache.get("1355785307081150575");
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle("✅ Bot Encendido")
            .setDescription(`**Funcionando correctamente**\n📌 **Cargados:** ${client.commands.size} comandos\n📶 **Ping:** ${client.ws.ping}ms`)
            .setTimestamp(); 
        logChannel.send({ embeds: [embed] });
    }
    client.user.setPresence({
        activities: [{ name: 'Bro maceta...', type: 0 }], // Cambia el nombre del estado
        status: 'dnd' // Opciones: 'online', 'idle', 'dnd' (No molestar), 'invisible'
    });
    
    const rest = new REST({ version: '10' }).setToken(config.TOKEN);
    const guildId = config.GUILD_ID;

    try {
        console.log('🚀 Registrando slash commands en el servidor...');
        const start = Date.now();

        await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, guildId), { body: commands });

        const end = Date.now();
        console.log(`✅ Comandos registrados en ${((end - start) / 1000).toFixed(2)}s.`);
    } catch (error) {
        console.error('❌ Error al registrar comandos:', error);
    }
});

// Conectar a MongoDB
mongoose.connect(config.MONGO_URI, { useNewUrlParser: true })
    .then(() => console.log('✅ Conectado a MongoDB'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// Cargar eventos
/*const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}
    MOVIDO A handlers/eventHandler.js
*/

client.login(config.TOKEN);