const { parse } = require('../utils/validation/resourceSchemas');
const { animeQuery, webhookSchema } = require('../utils/validation/integrationSchemas');
const { requestUpstream } = require('../services/upstream');
const { kirimNotifikasi } = require('../utils/notifikasi');
const httpError = require('../utils/httpError');

const queryAnime = async (req, res) => {
    const { q, limit, page } = parse(animeQuery, req.query);
    const params = {
        'page[limit]': limit,
        'page[offset]': (page - 1) * limit
    };

    if (q) {
        params['filter[text]'] = q;
    } else {
        params.sort = '-userCount';
    }

    const response = await requestUpstream({
        method: 'GET',
        url: process.env.UPSTREAM_ANIME || 'https://kitsu.io/api/edge/anime',
        params
    });

    if (!Array.isArray(response.data?.data)) {
        throw httpError(502, 'Respons layanan anime tidak valid');
    }

    const hasil = response.data.data.map(item => ({
        mal_id: item?.id ?? null,
        url: item?.id ? `https://kitsu.io/anime/${item.attributes?.slug ?? item.id}` : null,
        title: item?.attributes?.canonicalTitle ?? null,
        trailer: item?.attributes?.youtubeVideoId
        ? `https://youtu.be/${item.attributes.youtubeVideoId}`
        : null,
        type: item?.attributes?.subtype ?? null,
        episodes: item?.attributes?.episodeCount ?? null,
        status: item?.attributes?.status ?? null,
        rating: item?.attributes?.ageRating ?? null
    }));

    return res.json({
        total: hasil.length,
        data: hasil
    });
};

const ujiWebhook = async (req, res) => {
    const { pesan } = parse(webhookSchema, req.body);
    const delivery = await kirimNotifikasi(pesan);

    return res.json({
        message: delivery.sent ? 'Notifikasi terkirim' : 'Permintaan selesai; notifikasi tidak terkirim',
        notification: delivery
    });
};

module.exports = {
    queryAnime,
    ujiWebhook
};
