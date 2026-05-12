const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const badgesFile = path.join(__dirname, '..', 'badges.json');
const leaderboardConfigFile = path.join(__dirname, '..', 'badge_leaderboard.json');

// ID kanala za značke i ormariće
const ZNACKE_CHANNEL_ID = null; // Biće postavljeno dinamički kroz komandu

function loadBadges() {
    if (!fs.existsSync(badgesFile)) fs.writeFileSync(badgesFile, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(badgesFile));
}

function loadLeaderboardConfig() {
    if (!fs.existsSync(leaderboardConfigFile)) {
        fs.writeFileSync(leaderboardConfigFile, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(leaderboardConfigFile));
}

function saveLeaderboardConfig(data) {
    fs.writeFileSync(leaderboardConfigFile, JSON.stringify(data, null, 2));
}

/**
 * Generiše embed za leaderboard znački
 */
function buildLeaderboardEmbed(badges) {
    const entries = Object.entries(badges)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    const totalBadges = entries.length;

    let description = '';

    if (entries.length === 0) {
        description = '*Trenutno nema dodeljenih znački.*\n\n> Načelnici mogu dodeliti značke komandom `/znacka dodeli`';
    } else {
        // Header tabele
        description += '```\n';
        description += '╔═══════╦══════════════════════════╗\n';
        description += '║ BR.   ║ SLUŽBENIK                ║\n';
        description += '╠═══════╬══════════════════════════╣\n';
        description += '```\n';

        // Svaki red
        for (const [num, data] of entries) {
            const badgeNum = `#${num}`.padEnd(5);
            description += `> 🪪 \`${badgeNum}\` — <@${data.id}>\n`;
        }

        description += '\n';
    }

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🏛️ LSPD — REGISTAR ZNAČKI I ORMARIĆA')
        .setDescription(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '> *Službeni registar svih dodeljenih znački i ormarića\n> Los Santos Police Department*\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            description
        )
        .addFields(
            { name: '📊 Statistika', value: `> Ukupno aktivnih znački: **${totalBadges}**\n> Sledeći slobodan broj: **#${getNextFree(badges)}**`, inline: false }
        )
        .setFooter({ text: 'LSPD Automatski Sistem • Ažurira se automatski pri svakoj promeni' })
        .setTimestamp();

    return embed;
}

function getNextFree(badges) {
    let n = 1;
    while (badges[n.toString()]) n++;
    return n;
}

/**
 * Ažurira leaderboard poruku u kanalu.
 * Ako poruka ne postoji, šalje novu i čuva njen ID.
 * @param {Client} client - Discord.js Client instanca
 */
async function updateLeaderboard(client) {
    const config = loadLeaderboardConfig();
    const channelId = config.channelId;
    const messageId = config.messageId;

    if (!channelId) {
        console.warn('[LEADERBOARD] Kanal nije konfigurisan. Koristite /postavi-znacke da postavite leaderboard.');
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            console.warn('[LEADERBOARD] Kanal nije pronađen:', channelId);
            return;
        }

        const badges = loadBadges();
        const embed = buildLeaderboardEmbed(badges);

        // Pokušaj da ažuriraš postojeću poruku
        if (messageId) {
            try {
                const existingMsg = await channel.messages.fetch(messageId);
                await existingMsg.edit({ embeds: [embed] });
                console.log('[LEADERBOARD] Leaderboard ažuriran.');
                return;
            } catch (e) {
                // Poruka obrisana ili ne postoji — šaljemo novu
                console.warn('[LEADERBOARD] Stara poruka nije pronađena, šaljem novu...');
            }
        }

        // Šalji novu poruku
        const newMsg = await channel.send({ embeds: [embed] });
        config.messageId = newMsg.id;
        saveLeaderboardConfig(config);
        console.log('[LEADERBOARD] Novi leaderboard postavljen, ID:', newMsg.id);

    } catch (err) {
        console.error('[LEADERBOARD ERROR]', err.message);
    }
}

/**
 * Inicijalno postavljanje leaderboarda u kanal
 * @param {TextChannel} channel - Kanal u koji se postavlja
 * @param {Client} client - Discord.js Client instanca
 */
async function setupLeaderboard(channel, client) {
    const badges = loadBadges();
    const embed = buildLeaderboardEmbed(badges);

    const msg = await channel.send({ embeds: [embed] });

    const config = {
        channelId: channel.id,
        messageId: msg.id
    };
    saveLeaderboardConfig(config);

    console.log(`[LEADERBOARD] Postavljen u kanal ${channel.name} (${channel.id}), poruka: ${msg.id}`);
    return msg;
}

module.exports = {
    updateLeaderboard,
    setupLeaderboard,
    buildLeaderboardEmbed,
    loadLeaderboardConfig,
    saveLeaderboardConfig
};
