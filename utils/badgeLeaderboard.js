const { EmbedBuilder } = require('discord.js');
const { db } = require('./firebase');

// ID kanala za značke i ormariće
const ZNACKE_CHANNEL_ID = null; // Biće postavljeno dinamički kroz komandu

// Funkcija za očitavanje znački iz Firestore
async function loadBadges() {
    if (!db) return {};
    try {
        const doc = await db.collection('badges_system').doc('data').get();
        if (doc.exists) {
            return doc.data();
        } else {
            await db.collection('badges_system').doc('data').set({});
            return {};
        }
    } catch (e) {
        console.error('[FIREBASE ERROR] Ne mogu da učitam značke:', e);
        return {};
    }
}

// Funkcija za čuvanje znački u Firestore
async function saveBadges(badges) {
    if (!db) return;
    try {
        await db.collection('badges_system').doc('data').set(badges);
    } catch (e) {
        console.error('[FIREBASE ERROR] Ne mogu da sačuvam značke:', e);
    }
}

// Funkcija za učitavanje configa iz Firestore
async function loadLeaderboardConfig() {
    if (!db) return {};
    try {
        const doc = await db.collection('badges_system').doc('config').get();
        if (doc.exists) {
            return doc.data();
        } else {
            const initial = { channelId: null, messageId: null };
            await db.collection('badges_system').doc('config').set(initial);
            return initial;
        }
    } catch (e) {
        console.error('[FIREBASE ERROR] Ne mogu da učitam config:', e);
        return {};
    }
}

// Funkcija za čuvanje configa u Firestore
async function saveLeaderboardConfig(config) {
    if (!db) return;
    try {
        await db.collection('badges_system').doc('config').set(config, { merge: true });
    } catch (e) {
        console.error('[FIREBASE ERROR] Ne mogu da sačuvam config:', e);
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

        // Pokušaj da obrišeš postojeću poruku da bi nova bila na dnu
        if (messageId) {
            try {
                const existingMsg = await channel.messages.fetch(messageId);
                await existingMsg.delete();
            } catch (e) {
                // Poruka već obrisana ili ne postoji
            }
        }

        // Šalji novu poruku
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
 * @param {TextChannel} channel - Kanal u koji se postavlja
 * @param {Client} client - Discord.js Client instanca
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
