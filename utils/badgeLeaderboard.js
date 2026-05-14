const { EmbedBuilder } = require('discord.js');
const db = require('./database');

// Funkcija za očitavanje znački iz SQLite (vraća stari format objekta radi kompatibilnosti)
async function loadBadges() {
    try {
        const rows = db.prepare('SELECT badge_number, discord_id FROM badges').all();
        const badges = {};
        for (const row of rows) {
            badges[row.badge_number.toString()] = { id: row.discord_id };
        }
        return badges;
    } catch (e) {
        console.error('[SQLITE ERROR] Ne mogu da učitam značke:', e);
        return {};
    }
}

// Funkcija za čuvanje znački u SQLite
async function saveBadges(badges) {
    try {
        // Brisanje svih starih i upis novih (lakši sinhronizovani način da izbegnemo komplikacije s deltama)
        const deleteStmt = db.prepare('DELETE FROM badges');
        const insertStmt = db.prepare('INSERT INTO badges (badge_number, discord_id) VALUES (?, ?)');
        
        const transaction = db.transaction(() => {
            deleteStmt.run();
            for (const [badgeNum, data] of Object.entries(badges)) {
                insertStmt.run(parseInt(badgeNum), data.id);
            }
        });
        
        transaction();
    } catch (e) {
        console.error('[SQLITE ERROR] Ne mogu da sačuvam značke:', e);
    }
}

// Funkcija za učitavanje configa (leaderboard kanala)
async function loadLeaderboardConfig() {
    try {
        const channelRow = db.prepare('SELECT value FROM config WHERE key = ?').get('leaderboard_channel_id');
        const messageRow = db.prepare('SELECT value FROM config WHERE key = ?').get('leaderboard_message_id');
        
        return {
            channelId: channelRow ? channelRow.value : null,
            messageId: messageRow ? messageRow.value : null
        };
    } catch (e) {
        console.error('[SQLITE ERROR] Ne mogu da učitam config:', e);
        return { channelId: null, messageId: null };
    }
}

// Funkcija za čuvanje configa u SQLite
async function saveLeaderboardConfig(config) {
    try {
        const insertStmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
        
        db.transaction(() => {
            if (config.channelId) insertStmt.run('leaderboard_channel_id', config.channelId);
            if (config.messageId) insertStmt.run('leaderboard_message_id', config.messageId);
        })();
    } catch (e) {
        console.error('[SQLITE ERROR] Ne mogu da sačuvam config:', e);
    }
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
        .setFooter({ text: 'LSPD Automatski Sistem • Baza: Lokalna (SQLite)' })
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
 */
async function updateLeaderboard(client) {
    const config = await loadLeaderboardConfig();
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

        const badges = await loadBadges();
        const embed = buildLeaderboardEmbed(badges);

        if (messageId) {
            try {
                const existingMsg = await channel.messages.fetch(messageId);
                await existingMsg.delete();
            } catch (e) {
                // Poruka već obrisana ili ne postoji
            }
        }

        const newMsg = await channel.send({ embeds: [embed] });
        config.messageId = newMsg.id;
        await saveLeaderboardConfig(config);
        console.log('[LEADERBOARD] Novi leaderboard postavljen, ID:', newMsg.id);

    } catch (err) {
        console.error('[LEADERBOARD ERROR]', err.message);
    }
}

/**
 * Inicijalno postavljanje leaderboarda u kanal
 */
async function setupLeaderboard(channel, client) {
    const badges = await loadBadges();
    const embed = buildLeaderboardEmbed(badges);

    const msg = await channel.send({ embeds: [embed] });

    const config = {
        channelId: channel.id,
        messageId: msg.id
    };
    await saveLeaderboardConfig(config);

    console.log(`[LEADERBOARD] Postavljen u kanal ${channel.name} (${channel.id}), poruka: ${msg.id}`);
    return msg;
}

module.exports = {
    updateLeaderboard,
    setupLeaderboard,
    buildLeaderboardEmbed,
    loadLeaderboardConfig,
    saveLeaderboardConfig,
    loadBadges,
    saveBadges
};
