const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Prikazuje trenutnu listu pesama'),
    async execute(interaction) {
        const queue = useQueue(interaction.guild.id);
        
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Trenutno se ne pušta nikakva muzika!', ephemeral: true });
        }
        
        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray(); // Prebacuje redosled u klasičan niz (array)
        
        const embed = new EmbedBuilder()
            .setTitle(`🎶 Trenutno svira: ${currentTrack.title}`)
            .setDescription(
                tracks.length > 0
                ? tracks.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title}`).join('\n')
                : 'U redu nema više pesama.'
            )
            .setColor('#2b2d31')
            .setFooter({ text: tracks.length > 10 ? `I još ${tracks.length - 10} pesama...` : 'LSPD Muzički Bot' });

        return interaction.reply({ embeds: [embed] });
    }
};
