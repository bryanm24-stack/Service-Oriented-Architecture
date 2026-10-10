const { requestUpstream } = require('../services/upstream');

const kirimNotifikasi = async pesan => {
    const url = process.env.DISCORD_WEBHOOK_URL?.trim();

    if (!url) {
        return {
            sent: false,
            reason: 'not_configured'
        };
    }

    try {
        await requestUpstream({
            method: 'POST',
            url,
            data: {
                content: String(pesan).slice(0, 2000),
                allowed_mentions: {
                    parse: []
                }
            }
        });

        return {
            sent: true
        };
    } catch (error) {
        // URL webhook dan isi pesan tidak dicetak ke log.
        console.error('[webhook] Pengiriman gagal');

        return {
            sent: false,
            reason: 'delivery_failed'
        };
    }
};

module.exports = {
    kirimNotifikasi
};
