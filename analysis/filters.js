const filters = {};
const moment = require('moment')



filters.filterDate = (maxYears) => (datas) => datas.filter( ({date_publish}) => {
  const yearsOld = parseInt( moment(date_publish).fromNow(true).split(' ')[0] );
  return yearsOld < maxYears;
});

filters.filterSize = (minSize) => (datas) => datas.filter( d => d.text && d.text.length > minSize )

module.exports = filters;
