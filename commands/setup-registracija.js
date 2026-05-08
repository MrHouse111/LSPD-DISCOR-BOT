const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup-registracija')
		.setDescription('Postavlja panel za izradu lične karte i registraciju (Samo za admine)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
		const embed = new EmbedBuilder()
			.setColor('#ffaa00')
			.setTitle('LSPD - Prijavnica / Registracija')
			.setDescription('Svi službenici su dužni da se registruju u sistem.\nKliknite na dugme ispod kako biste popunili vaše podatke za Ličnu Kartu.')
            .setThumbnail('https://media.discordapp.net/attachments/1111/1111/lspd_logo.png'); // placeholder

		const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('register_btn')
					.setLabel('📝 Registruj se')
					.setStyle(ButtonStyle.Primary),
			);

		await interaction.reply({ content: 'Panel je uspešno postavljen. NAPOMENA: Ova komanda se koristi isključivo jednokratno prilikom postavljanja panela.', ephemeral: true });
		await interaction.channel.send({ embeds: [embed], components: [row] });
	},
};
