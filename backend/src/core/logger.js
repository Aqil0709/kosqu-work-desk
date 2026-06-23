const formatDate = () => new Date().toISOString();

const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ level: 'info', time: formatDate(), message, ...meta }));
  },
  error: (message, meta = {}) => {
    const errorData = { level: 'error', time: formatDate(), message };
    if (meta.error) {
      errorData.error = meta.error instanceof Error ? { message: meta.error.message, stack: meta.error.stack } : meta.error;
    } else {
      Object.assign(errorData, meta);
    }
    console.error(JSON.stringify(errorData));
  },
};

module.exports = logger;
