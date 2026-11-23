const { Op } = require('sequelize');
const { RecurringCost, RecurringOccurrence, Category, sequelize } = require('../models');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const schemas = require('../utils/validation/recurringCostSchemas');
const httpError = require('../utils/httpError');
const Joi = require('joi');


async function fetchValidatedReport(req){
    const userId = req.user && (req.user.id || req.user.userId);
    if (!userId) {
        throw httpError(401, 'Sesi tidak valid atau pengguna tidak terautentikasi. Silakan masuk untuk mengakses laporan.');
    }

    // validasi query pake helper parse
    const validated = parse(reportSchemas.getExpenseReportSchema, req.query);

    return expenseReportService.getExpenseReport({userId, startDate: validated.startDate, endDate: validated.endDate, sort: validated.sort});
}
const getExpenseJson = async (req, res,next) => {
    try {
        const report = await fetchValidatedReport(req);

        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        return next(error);
    }
}

const getExpensePdf = async (req, res,next) => {
    try {
        const report = await fetchValidatedReport(req);
        const pdfBuffer = await expenseReportService.generateExpenseReportPdf(report); 
        const rawname = `laporan_pengeluaran_${req.user.id}_${report.period.startDate}_sd_${report.period.endDate}.pdf`;
        const safeFilename = rawname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.status(200).send(pdfBuffer);
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getExpenseJson,
    getExpensePdf
};
