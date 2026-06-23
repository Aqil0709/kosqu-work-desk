const INDIA_TIME_ZONE = 'Asia/Kolkata';

const getIndiaDateTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getIndiaDate = (date = new Date()) => {
  const parts = getIndiaDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getIndiaDateTime = (date = new Date()) => {
  const parts = getIndiaDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const getIndiaTime = (date = new Date()) => {
  const parts = getIndiaDateTimeParts(date);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
};

module.exports = {
  INDIA_TIME_ZONE,
  getIndiaDate,
  getIndiaDateTime,
  getIndiaTime
};
