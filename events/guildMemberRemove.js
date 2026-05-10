const { Events, EmbedBuilder } = require('discord.js');

const DOVIDJENJA_CHANNEL_ID = '1503168695508406403';

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const channel = await member.client.channels.fetch(DOVIDJENJA_CHANNEL_ID);
            if (!channel) return;

            // Proveri da li je korisnik kickovan ili banovan (audit log)
            let leaveReason = 'Napustio server';
            let color = '#95a5a6'; // siva za dobrovoljni odlazak

            try {
                // Potrebna AuditLog dozvola
                const auditLogs = await member.guild.fetchAuditLogs({ limit: 5 });
                const now = Date.now();

                // Provera kickova (u poslednjih 5 sekundi)
                const kickLog = auditLogs.entries.find(e =>
                    e.action === 20 && // MEMBER_KICK
                    e.target?.id === member.id &&
                    (now - e.createdTimestamp) < 5000
                );

                // Provera banovanja (u poslednjih 5 sekundi)
                const banLog = auditLogs.entries.find(e =>
                    e.action === 22 && // MEMBER_BAN_ADD
                    e.target?.id === member.id &&
                    (now - e.createdTimestamp) < 5000
                );

                if (banLog) {
                    leaveReason = `Banovan od strane **${banLog.executor?.username || 'Nepoznato'}**`;
                    if (banLog.reason) leaveReason += `\nRazlog: ${banLog.reason}`;
                    color = '#8B0000';
                } else if (kickLog) {
                    leaveReason = `Kickovan od strane **${kickLog.executor?.username || 'Nepoznato'}**`;
                    if (kickLog.reason) leaveReason += `\nRazlog: ${kickLog.reason}`;
                    color = '#e74c3c';
                }
            } catch (auditErr) {
                console.warn('[DOVIDJENJA] Ne mogu da pristupim Audit Logu:', auditErr.message);
                // Nastavlja bez razloga — botova uloga ne sadrzi VIEW_AUDIT_LOG, okej je
            }

            // Uloge korisnika (pre odlaska)
            const roles = member.roles.cache
                .filter(r => r.id !== member.guild.id) // bez @everyone
                .map(r => r.name)
                .join(', ') || 'Nema uloga';

            // Datum pridruživanja
            const joinedAt = member.joinedAt
                ? member.joinedAt.toLocaleDateString('sr-RS', { timeZone: 'Europe/Belgrade', day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Nepoznato';

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle('👋 Doviđenja!')
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .addFields(
                    { name: '👤 Korisnik', value: `**${member.displayName}** (${member.user.username})`, inline: true },
                    { name: '🆔 ID', value: `\`${member.user.id}\``, inline: true },
                    { name: '📅 Pridružio se', value: joinedAt, inline: true },
                    { name: '📋 Uloge', value: roles, inline: false },
                    { name: '📌 Razlog odlaska', value: leaveReason, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `Trenutno članova: ${member.guild.memberCount}` });

            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('[DOVIDJENJA ERROR]', err);
        }
    }
};
