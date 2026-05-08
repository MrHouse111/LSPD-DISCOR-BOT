const { Events } = require('discord.js');
const statsStore = require('../utils/statsStore');

// Održavamo privremenu mapu za sesije u voice kanalu.
// (Gubi se nakon restarta bota, ali je dovoljno za osnovnu statistiku)
const voiceSessions = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        // Ignoriši botove
        if (newState.member?.user.bot) return;

        const userId = newState.member.id;
        const username = newState.member.user.username;

        // Proveri da li je korisnik ušao u voice kanal
        if (!oldState.channelId && newState.channelId) {
            // Ušao je u neki voice kanal, a ranije nije bio
            if (!voiceSessions.has(userId)) {
                voiceSessions.set(userId, Date.now());
            }
        }
        // Proveri da li je korisnik izašao iz voice kanala
        else if (oldState.channelId && !newState.channelId) {
            // Izašao iz voice kanala
            if (voiceSessions.has(userId)) {
                const joinTime = voiceSessions.get(userId);
                const durationMs = Date.now() - joinTime;
                voiceSessions.delete(userId);
                
                // Zapiši vreme u statsStore
                statsStore.addVoiceTime(userId, username, durationMs);
            }
        }
        // U slučaju da je korisnik samo promenio kanal unutar servera (iz jednog u drugi),
        // oldState.channelId i newState.channelId će oba biti true, pa ne prekidamo sesiju.
    },
};
