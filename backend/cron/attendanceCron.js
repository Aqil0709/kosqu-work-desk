// backend/cron/attendanceCron.js
const cron = require('node-cron');
const AutoAbsentService = require('../services/autoAbsentService');

// Schedule to run daily at 11:59 PM (adjust based on your needs)
function scheduleAutoAbsentCron() {
    // Run at 11:59 PM every day
    cron.schedule('59 23 * * *', async () => {
        console.log('⏰ Running scheduled auto absent marking...');
        try {
            const result = await AutoAbsentService.run();
            console.log(`✅ Scheduled auto absent completed: ${result.markedCount} marked`);
        } catch (error) {
            console.error('❌ Scheduled auto absent failed:', error);
        }
    });

    console.log('⏰ Auto absent cron job scheduled to run daily at 11:59 PM');
}

module.exports = { scheduleAutoAbsentCron };