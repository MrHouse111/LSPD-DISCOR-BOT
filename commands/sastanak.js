const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const MeetingRecorder = require('../utils/MeetingRecorder');
const geminiAI = require('../utils/geminiAI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sastanak')
        .setDescription('Upravljanje snimanjem i zapisnikom sa sastanka (Samo za Načelnike)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('zapocni')
                .setDescription('Započinje snimanje sastanka u Voice kanalu u kom se nalazite')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('zavrsi')
                .setDescription('Završava snimanje i generiše AI zapisnik u kanal za obaveštenja')
        ),
    async execute(interaction) {
        if (!interaction.member) return interaction.reply({ content: '❌ Ova komanda se može koristiti isključivo na serveru!', ephemeral: true });

        // Dozvola samo za Načelnike i Administratore
        const hasRole = interaction.member.roles.cache.some(role => role.name === '👮NACELNIK👮' || role.name.toLowerCase() === 'director' || role.name.toLowerCase() === 'zamenik nacelnika');
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Samo Načelnici mogu koristiti ovu komandu.', ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();

        if (subCommand === 'zapocni') {
            const result = MeetingRecorder.startMeeting(interaction);
            
            if (result.error) {
                return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
            }

            return interaction.reply({ content: '🎙️ **Snimanje sastanka je započeto!** Sve izgovoreno se beleži za potrebe zapisnika.', ephemeral: false });
        }
        else if (subCommand === 'zavrsi') {
            await interaction.deferReply({ ephemeral: false });

            const result = MeetingRecorder.stopMeeting(interaction.guildId);

            if (result.error) {
                return interaction.editReply({ content: `❌ ${result.error}` });
            }

            await interaction.editReply({ content: '⏹️ **Snimanje je završeno.** Procesiram audio fajlove i generišem zapisnik pomoću AI... Ovo može potrajati minut ili dva.' });

            try {
                // Generisanje zapisnika
                const reportText = await geminiAI.generateMeetingReport(result.files);

                // Kanal za obaveštenja (iz plana implementacije)
                const reportChannelId = '1467407954784551098';
                let reportChannel = interaction.guild.channels.cache.get(reportChannelId);
                
                // Ako kanal nije keširan, pokušavamo da ga dohvatimo
                if (!reportChannel) {
                    try {
                        reportChannel = await interaction.guild.channels.fetch(reportChannelId);
                    } catch(e) {
                        console.error('Kanal za zapisnike nije pronadjen.', e);
                    }
                }

                // Skracivanje texta ako prelazi limit embeda od 4096 karaktera
                const safeReportText = reportText.length > 4000 ? reportText.substring(0, 4000) + '...' : reportText;

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(safeReportText)
                    .setFooter({ text: `Zapisnik generisao: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                if (reportChannel) {
                    await reportChannel.send({ embeds: [embed] });
                    await interaction.followUp({ content: `✅ Zapisnik je uspešno generisan i poslat u kanal <#${reportChannelId}>!`, ephemeral: true });
                } else {
                    await interaction.followUp({ content: '✅ Zapisnik je generisan, ali predefinisani kanal za obaveštenja nije pronađen. Evo zapisnika:', embeds: [embed] });
                }

            } catch (error) {
                console.error("Greska pri obradi sastanka:", error);
                await interaction.followUp({ content: '❌ Došlo je do greške prilikom generisanja zapisnika. Proverite logove i API ključ.', ephemeral: true });
            }
        }
    }
};
