const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config.json');

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
        const command = require(path.join(folderPath, file));
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
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
        activities: [{ name: 'Bro respeta..', type: 0 }], // Cambia el nombre del estado
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
