const normalizeDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString().split("T")[0];
};

const getDayName = (date) => {
  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) {
    return null;
  }

  return new Date(`${normalizedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC"
  });
};

module.exports = {
  getDayName,
  normalizeDate
};
