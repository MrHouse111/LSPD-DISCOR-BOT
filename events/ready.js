const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`LSPD Bot is online as ${client.user.tag}!`);
	},
};
