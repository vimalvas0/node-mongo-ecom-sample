exports.formatDateForSearch = function formatDate(date) {
  const [year, month, day] = date.split("/");
  const formattedDate = `${year}/${month.padStart(2, "0")}/${day.padStart(2, "0")}`;
  return formattedDate;
};
