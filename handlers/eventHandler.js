const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventDirs = [
        path.join(__dirname, '..', 'events'),
        path.join(__dirname, '..', 'events', 'auditored') // opcional, si existe
    ];

    // Recolectar archivos .js existentes en las rutas
    const eventFiles = eventDirs.flatMap(dir =>
        fs.existsSync(dir)
            ? fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f))
            : []
    );

    for (const filePath of eventFiles) {
        let event;
        try {
            delete require.cache[require.resolve(filePath)];
            event = require(filePath);
        } catch (err) {
            console.error('Error cargando event:', filePath, err);
            continue;
        }

        if (!event || !event.name || typeof event.execute !== 'function') {
            console.warn('Event inválido o sin execute():', filePath);
            continue;
        }

        try {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`Event cargado: ${event.name} ${event.once ? '(once)' : ''} -> ${path.relative(process.cwd(), filePath)}`);
        } catch (err) {
            console.error('Error registrando event:', filePath, err);
        }
    }
};
