const { Events } = require('discord.js');

const voiceStateUpdate = require('./voiceStateUpdate');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`LSPD Bot is online as ${client.user.tag}!`);

		// Inicijalizuj ljude koji su već u voice kanalu pre nego što se bot upalio (ili posle restarta)
		let voiceCount = 0;
		client.guilds.cache.forEach(guild => {
			guild.channels.cache.filter(c => c.isVoiceBased()).forEach(channel => {
				channel.members.forEach(member => {
					if (!member.user.bot) {
						if (!voiceStateUpdate.voiceSessions.has(member.id)) {
							voiceStateUpdate.voiceSessions.set(member.id, Date.now());
							voiceCount++;
						}
					}
				});
			});
		});
		console.log(`[VOICE] Inicijalizovano ${voiceCount} aktivnih voice sesija nakon restarta bota.`);
	},
};
