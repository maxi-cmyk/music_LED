function minutesSinceMidnight(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isNightActive(config, now = new Date()) {
  if (!config.nightEnabled) return false;
  const start = minutesSinceMidnight(config.nightStart);
  const end = minutesSinceMidnight(config.nightEnd);
  const current = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

module.exports = { isNightActive, minutesSinceMidnight };
