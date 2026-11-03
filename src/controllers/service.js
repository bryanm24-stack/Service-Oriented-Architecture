const getService = (req, res) => res.json({
    service: 'Asisten Keuangan',
    endpointCount: 30,
    resources: ['/api/v1/users', '/api/v1/categories', '/api/v1/transactions', '/api/v1/budgets']
});

module.exports = { getService };
