const { SlashCommandBuilder } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Pusti pesmu ili YouTube URL')
        .addStringOption(option => 
            option.setName('pesma')
                .setDescription('Ime pesme ili direktan URL')
                .setRequired(true)
        ),
    async execute(interaction) {
        const player = useMainPlayer();
        const channel = interaction.member.voice.channel;
        
        if (!channel) {
            return interaction.reply({ content: '❌ Moraš biti u glasovnom kanalu da bi pustio muziku!', ephemeral: true });
        }
        
        const query = interaction.options.getString('pesma', true);
        await interaction.deferReply(); // Odradi defer jer pronalazak pesme i njeno učitavanje može trajati više od 3 sekunde
        
        try {
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        client: interaction.guild.members.me,
                        requestedBy: interaction.user
                    },
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000,
                }
            });
            
            return interaction.followUp(`🎶 Uspešno učitano i dodato na listu: **${track.title}**`);
        } catch (e) {
            console.error(e);
            return interaction.followUp('❌ Došlo je do greške prilikom pretrage ili puštanja te pesme. Pokušajte drugi link ili naziv.');
        }
    }
};
