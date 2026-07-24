require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const guildId = process.env.GUILD_ID;
    const isGlobal = !guildId || guildId.includes('your_');

    if (isGlobal) {
      console.log(`🌍 Registrando ${commands.length} comandos globalmente...`);
      console.log('⚠️  Los comandos globales pueden tardar hasta 1 hora en aparecer.');
      console.log('   Para registrarlos al instante, agrega GUILD_ID=ID_DE_TU_SERVIDOR en el .env\n');

      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log(`✅ ${data.length} comandos registrados globalmente.`);
    } else {
      console.log(`📌 Registrando ${commands.length} comandos en el servidor ${guildId}...`);

      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands },
      );
      console.log(`✅ ${data.length} comandos registrados en el servidor.`);
    }
  } catch (error) {
    console.error('❌ Error al registrar comandos:', error);
  }
})();
