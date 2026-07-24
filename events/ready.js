module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✅ ${client.user.tag} está en línea.`);
    console.log(`🖥️  Conectado en ${client.guilds.cache.size} servidores.`);
  },
};
