const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('postavi-duznost')
		.setDescription('Postavlja panel za prijavu/odjavu sa dužnosti'),
	async execute(interaction) {
		const hasRole = interaction.member.roles.cache.some(role => ['director', 'zamenik nacelnika'].includes(role.name.toLowerCase()));
		const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
		if (!hasRole && !isAdmin) {
			return interaction.reply({ content: '❌ Samo Načelnici i Administratori mogu koristiti ovu komandu!', ephemeral: true });
		}
		const embed = new EmbedBuilder()
			.setColor('#0099ff')
			.setTitle('LSPD - Evidencija Dužnosti')
			.setDescription('Kliknite na odgovarajuće dugme ispod kako biste se prijavili ili odjavili sa dužnosti.\n\nZloupotreba ovog sistema strogo je kažnjiva.')
            .setImage('https://media.discordapp.net/attachments/1111/1111/lspd_banner.png'); // placeholder for a banner if they want later

		const row = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('duty_on')
					.setLabel('🟢 Prijava na dužnost')
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId('duty_off')
					.setLabel('🔴 Odjava sa dužnosti')
					.setStyle(ButtonStyle.Danger),
			);

		await interaction.reply({ content: 'Panel je uspešno postavljen. NAPOMENA: Ova komanda se koristi isključivo jednokratno prilikom postavljanja panela.', ephemeral: true });
		await interaction.channel.send({ embeds: [embed], components: [row] });
	},
};
