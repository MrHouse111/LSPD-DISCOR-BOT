const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-odsustvo')
        .setDescription('Postavlja panel za prijavu odsustva u trenutni kanal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('LSPD - Prijava Odsustva')
            .setDescription('Ukoliko ste sprečeni da prisustvujete dužnosti ili sastanku, kliknite na dugme ispod kako biste popunili formular za odsustvo.\n\nSvako neopravdano odsustvo duže od 48h rezultiraće otkazom.')
            .setTimestamp()
            .setFooter({ text: 'LSPD High Command' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('odsustvo_btn')
                    .setLabel('📝 Prijavi Odsustvo')
                    .setStyle(ButtonStyle.Primary),
            );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Panel je uspešno postavljen. NAPOMENA: Ova komanda se koristi isključivo jednokratno prilikom postavljanja panela.', ephemeral: true });
    },
};
