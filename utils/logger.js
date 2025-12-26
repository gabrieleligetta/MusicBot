const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, 'bot.log');

function formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
}

function writeLog(level, message) {
    const formatted = formatMessage(level, message);
    console.log(formatted); // Stampa sempre in console per Docker logs
    fs.appendFileSync(logFile, formatted + '\n');
}

module.exports = {
    info: (message) => writeLog('INFO', message),
    warn: (message) => writeLog('WARN', message),
    error: (message, error) => {
        const errorMsg = error ? `${message} | Error: ${error.message}\nStack: ${error.stack}` : message;
        writeLog('ERROR', errorMsg);
    }
};
