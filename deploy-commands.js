try {
	require('dotenv').config();
} catch (e) {
	// dotenv not installed — continue and rely on existing environment variables
}
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN?.trim());

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		const { Client, GatewayIntentBits } = require('discord.js');
		const tempClient = new Client({ intents: [GatewayIntentBits.Guilds] });

		await tempClient.login(process.env.DISCORD_TOKEN?.trim());
		const clientId = tempClient.user.id;

		let data;
		if (process.env.GUILD_ID) {
			data = await rest.put(
				Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
				{ body: commands },
			);
			console.log(`Successfully reloaded ${data.length} guild (/) commands for GUILD_ID ${process.env.GUILD_ID}.`);
		} else {
			data = await rest.put(
				Routes.applicationCommands(clientId),
				{ body: commands },
			);
			console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
		}

		tempClient.destroy();
	} catch (error) {
		console.error(error);
	}
})();
