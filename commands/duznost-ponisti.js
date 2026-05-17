const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const dutyStore = require('../utils/dutyStore');
const statsStore = require('../utils/statsStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duznost-ponisti')
        .setDescription('Administrativno poništavanje dužnosti AFK člana (Samo za Načelnike)')
        .addUserOption(option =>
            option.setName('clan')
                .setDescription('Član kome poništavate dužnost')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razlog')
                .setDescription('Razlog poništavanja dužnosti')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member) return interaction.reply({ content: '❌ Ova komanda se može koristiti isključivo na serveru!', ephemeral: true });

        // Dozvola samo za Načelnike i Administratore
        const hasRole = interaction.member.roles.cache.some(role => role.name === '👮NACELNIK👮' || role.name.toLowerCase() === 'director' || role.name.toLowerCase() === 'zamenik nacelnika');
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasRole && !isAdmin) {
            return interaction.reply({ content: '❌ Nemate dozvolu! Samo Načelnici mogu koristiti ovu komandu.', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('clan');
        const razlog = interaction.options.getString('razlog') || 'Nije naveden';

        const onDuty = await dutyStore.isOnDuty(targetUser.id);
        if (!onDuty) {
            return interaction.reply({ content: `❌ Korisnik <@${targetUser.id}> trenutno nije prijavljen na dužnost.`, ephemeral: true });
        }

        // Pronalazimo kanal gde je član započeo dužnost da bismo tamo poslali odjavu
        const activeDuties = await dutyStore.getActiveDuty();
        const dutyInfo = activeDuties.find(d => d.userId === targetUser.id);

        // Poništavanje (checkOut ali ne dodajemo vreme u statistiku)
        await dutyStore.checkOut(targetUser.id);

        // Dodavanje poništene dužnosti u statistiku (brojač sankcija)
        await statsStore.addDutyCancellation(targetUser.id, targetUser.username);
        const userStats = await statsStore.getUserStats(targetUser.id);
        const brojPonistavanja = userStats ? userStats.duty_cancellations : 1;

        const timeString = new Date().toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Belgrade' });

        // Slanje obaveštenja u DM
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🛑 Dužnost Poništena')
                .setDescription(`Vaša dužnost je **administrativno poništena** od strane Načelnika **${interaction.user.displayName}**.\n\n**Razlog:** ${razlog}\n\n*Vreme provedeno u ovoj smeni se neće računati.*`)
                .setTimestamp()
                .setFooter({ text: 'LSPD High Command' });
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            console.warn(`[DUZNOST-PONISTI] Nije moguće poslati DM korisniku ${targetUser.id}`);
        }

        // Slanje javne odjave u kanal dužnosti
        if (dutyInfo && dutyInfo.channelId) {
            try {
                const dutyChannel = await interaction.client.channels.fetch(dutyInfo.channelId);
                if (dutyChannel) {
                    const publicEmbed = new EmbedBuilder()
                        .setColor('#8B0000')
                        .setDescription(`🛑 **${targetUser.username}** je **administrativno odjavljen/a** sa dužnosti u **${timeString}**.\n\n👤 **Odjavio:** ${interaction.user.displayName}\n📝 **Razlog:** ${razlog}`);
                    await dutyChannel.send({ embeds: [publicEmbed] });
                }
            } catch (err) {
                console.warn(`[DUZNOST-PONISTI] Ne mogu da pronađem kanal dužnosti ${dutyInfo.channelId}`);
            }
        }

        // Potvrda Načelniku
        await interaction.reply({ 
            content: `✅ Dužnost korisnika <@${targetUser.id}> je uspešno poništena.\n\n⚠️ Ovom korisniku je do sada dužnost poništena ukupno **${brojPonistavanja} put(a)**.`, 
            ephemeral: true 
        });
    },
};
