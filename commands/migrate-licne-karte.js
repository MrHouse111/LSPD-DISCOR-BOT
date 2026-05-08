const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('migrate-licne-karte')
		.setDescription('Pretvara sve stare obične poruke u ovom kanalu u LSPD Lične Karte (Samo za admine)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Fetch up to 100 messages from the current channel
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            
            // Filter messages that are not from a bot and have some content
            const userMessages = messages.filter(m => !m.author.bot && m.content && m.content.length > 0);
            
            if (userMessages.size === 0) {
                return interaction.editReply('Nema starih običnih poruka za migraciju u ovom kanalu (ili su starije od 100 poruka).');
            }

            let count = 0;

            // Sort so we process the oldest ones first to maintain order if desired
            const sortedMessages = Array.from(userMessages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            for (const msg of sortedMessages) {
                const cleanContent = msg.content.replace(/\*\*/g, '');
                const matchLicna = cleanContent.match(/Ime na li[cč]noj:\s*([^\n]+)/i);
                const matchSteam = cleanContent.match(/Ime na steam(?:-u|u)?:\s*([^\n]+)/i);
                const matchUuid = cleanContent.match(/UUID:\s*([^\n]+)/i);

                if (!matchLicna || !matchSteam || !matchUuid) {
                    continue; // Preskače poruke koje nisu u ovom formatu
                }

                const imeNaLicnoj = matchLicna[1].trim();
                const imeNaSteam = matchSteam[1].trim();
                const uuid = matchUuid[1].trim();

                const idEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('👮 LSPD Lična Karta')
                    .setThumbnail(msg.author.displayAvatarURL())
                    .addFields(
                        { name: 'Službenik', value: `<@${msg.author.id}>`, inline: false },
                        { name: 'Ime na ličnoj', value: imeNaLicnoj, inline: true },
                        { name: 'Ime na Steam-u', value: imeNaSteam, inline: true },
                        { name: 'UUID', value: uuid, inline: true }
                    )
                    .setFooter({ text: 'Migrirana stara evidencija' })
                    .setTimestamp(msg.createdAt);

                // Send the new embed with content ping
                await interaction.channel.send({ content: `<@${msg.author.id}>`, embeds: [idEmbed] });
                
                // Delete the old message
                await msg.delete();
                count++;
            }

            await interaction.editReply(`Upešno migrirano ${count} starih ličnih karata!`);
        } catch (error) {
            console.error('Greška pri migraciji:', error);
            await interaction.editReply('Došlo je do greške prilikom migracije. Moguće je da bot nema dozvolu za čitanje/brisanje poruka u ovom kanalu.');
        }
	},
};
