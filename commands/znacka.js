const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { updateLeaderboard, loadBadges, saveBadges } = require('../utils/badgeLeaderboard');

const LOG_CHANNEL_ID = '1504164741931864164';

function nextFreeBadge(badges) {
    let n = 1;
    while (badges[n.toString()]) n++;
    return n;
}

function findUserBadge(badges, userId) {
    for (const [num, data] of Object.entries(badges)) {
        if (data.id === userId) return num;
    }
    return null;
}

async function sendLog(client, embed) {
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('[LOG ERROR] Ne mogu da pošaljem poruku u log kanal:', err);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('znacka')
        .setDescription('Upravljanje značkama policajaca (Samo za Načelnike)')
        .addSubcommand(sub =>
            sub.setName('dodeli')
                .setDescription('Dodeljuje značku korisniku')
                .addUserOption(o => o.setName('korisnik').setDescription('Korisnik').setRequired(true))
                .addIntegerOption(o => o.setName('broj').setDescription('Broj značke (opciono — auto ako se ne upiše)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('ukloni')
                .setDescription('Uklanja značku korisniku (bez kicka)')
                .addUserOption(o => o.setName('korisnik').setDescription('Korisnik').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('izmeni')
                .setDescription('Menja broj značke korisniku')
                .addUserOption(o => o.setName('korisnik').setDescription('Korisnik').setRequired(true))
                .addIntegerOption(o => o.setName('novi_broj').setDescription('Novi broj značke').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Prikazuje značku korisnika')
                .addUserOption(o => o.setName('korisnik').setDescription('Korisnik').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const badges = await loadBadges();
        
        const hasRole = interaction.member.roles.cache.some(role =>
            ['director', '👮nacelnik👮'].includes(role.name.toLowerCase())
        );
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (sub === 'dodeli') {
            if (!hasRole && !isAdmin) return interaction.reply({ content: '❌ Samo Načelnici mogu dodeliti značku!', ephemeral: true });

            const targetUser = interaction.options.getUser('korisnik');
            const requestedNum = interaction.options.getInteger('broj');

            // Provjera da li već ima značku
            const existing = findUserBadge(badges, targetUser.id);
            if (existing) {
                return interaction.reply({ content: `❌ <@${targetUser.id}> već ima značku **#${existing}**. Koristite \`/znacka izmeni\` za promenu broja.`, ephemeral: true });
            }

            let badgeNum;
            if (requestedNum) {
                if (badges[requestedNum.toString()]) {
                    return interaction.reply({ content: `❌ Broj značke **${requestedNum}** je već zauzet!`, ephemeral: true });
                }
                badgeNum = requestedNum;
            } else {
                badgeNum = nextFreeBadge(badges);
            }

            badges[badgeNum.toString()] = { id: targetUser.id, name: targetUser.username };
            await saveBadges(badges);
            
            // Ažuriraj leaderboard
            updateLeaderboard(interaction.client);

            // Slanje DM-a korisniku
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('👮 LSPD — Dodela Značke')
                    .setDescription(`Čestitamo! Dodeljen vam je broj značke i ormarića.\n\n🪪 **Vaš broj značke:** \`#${badgeNum}\`\n🗄️ **Vaš ormarić broj:** \`${badgeNum}\`\n\n*Sačuvajte ovaj broj — to je vaš identifikator u stanici.*`)
                    .setTimestamp();
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (e) {
                console.warn(`[ZNACKA] Ne može se poslati DM korisniku ${targetUser.id}`);
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👮 LSPD — Značka Dodeljena')
                .addFields(
                    { name: 'Policajac', value: `<@${targetUser.id}>`, inline: true },
                    { name: 'Broj Značke', value: `**#${badgeNum}**`, inline: true },
                    { name: 'Sledeći slobodan', value: `#${nextFreeBadge(badges)}`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await sendLog(interaction.client, embed);

            return interaction.reply({ content: `✅ Uspešno dodeljena značka **#${badgeNum}** korisniku <@${targetUser.id}>.`, ephemeral: true });
        }

        if (sub === 'ukloni') {
            if (!hasRole && !isAdmin) return interaction.reply({ content: '❌ Samo Načelnici mogu ukloniti značku!', ephemeral: true });

            const targetUser = interaction.options.getUser('korisnik');
            const existing = findUserBadge(badges, targetUser.id);

            if (!existing) {
                return interaction.reply({ content: `❌ <@${targetUser.id}> nema dodeljenu značku.`, ephemeral: true });
            }

            delete badges[existing];
            await saveBadges(badges);
            
            // Ažuriraj leaderboard
            updateLeaderboard(interaction.client);

            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('🗑️ Značka Uklonjena')
                .setDescription(`Značka **#${existing}** je uklonjena sa korisnika <@${targetUser.id}>.\nBroj je sada slobodan.`)
                .setTimestamp();
            
            await sendLog(interaction.client, embed);

            return interaction.reply({ content: `✅ Uspešno uklonjena značka **#${existing}** korisniku <@${targetUser.id}>.`, ephemeral: true });
        }

        if (sub === 'izmeni') {
            if (!hasRole && !isAdmin) return interaction.reply({ content: '❌ Samo Načelnici mogu izmeniti značku!', ephemeral: true });

            const targetUser = interaction.options.getUser('korisnik');
            const newNum = interaction.options.getInteger('novi_broj');
            const existing = findUserBadge(badges, targetUser.id);

            if (!existing) {
                return interaction.reply({ content: `❌ <@${targetUser.id}> nema dodeljenu značku.`, ephemeral: true });
            }
            if (badges[newNum.toString()] && badges[newNum.toString()].id !== targetUser.id) {
                return interaction.reply({ content: `❌ Broj **${newNum}** je već zauzet!`, ephemeral: true });
            }

            delete badges[existing];
            badges[newNum.toString()] = { id: targetUser.id, name: targetUser.username };
            await saveBadges(badges);
            
            // Ažuriraj leaderboard
            updateLeaderboard(interaction.client);

            // Slanje DM-a korisniku
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('👮 LSPD — Nova Značka')
                    .setDescription(`Vaš broj značke i ormarića je izmenjen!\n\n🪪 **Vaš novi broj značke:** \`#${newNum}\`\n🗄️ **Vaš novi ormarić:** \`${newNum}\`\n\n*Stari broj #${existing} više nije važeći.*`)
                    .setTimestamp();
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (e) {
                console.warn(`[ZNACKA] Ne može se poslati DM korisniku ${targetUser.id}`);
            }

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('✏️ Značka Izmenjena')
                .setDescription(`<@${targetUser.id}> sada ima značku **#${newNum}** (prethodno: #${existing}).`)
                .setTimestamp();
            
            await sendLog(interaction.client, embed);

            return interaction.reply({ content: `✅ Uspešno izmenjena značka korisniku <@${targetUser.id}> u **#${newNum}**.`, ephemeral: true });
        }

        if (sub === 'info') {
            const targetUser = interaction.options.getUser('korisnik');
            const existing = findUserBadge(badges, targetUser.id);

            if (!existing) {
                return interaction.reply({ content: `ℹ️ <@${targetUser.id}> nema dodeljenu značku.`, ephemeral: true });
            }

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('🪪 Informacije o Značci')
                    .addFields(
                        { name: 'Policajac', value: `<@${targetUser.id}>`, inline: true },
                        { name: 'Broj Značke', value: `**#${existing}**`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL())
                    .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
};
