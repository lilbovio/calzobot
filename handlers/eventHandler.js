const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    // const eventFiles = fs.readdirSync(path.join(__dirname, '../events')).filter(file => file.endsWith('.js'));

    const eventDirs = [
        path.join(__dirname, '../events'),
        path.join(__dirname, '../events/auditored') // Agregar rutas internas
    ];
    
    const eventFiles = eventDirs.flatMap(dir =>
        fs.existsSync(dir) ?
            fs.readdirSync(dir).filter(file => file.endsWith('.js'))
                .map(file => path.join(dir, file)) // agrega la ruta al nombre de cada archivo
            : []
    );

    for (const file of eventFiles) {
        // const event = require(`../events/${file}`);

        const event = require(file);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            // Verifica si la función `execute` espera `client`
            client.on(event.name, (...args) => {
                event.execute(...args, client);
            });
        }
    }
};
