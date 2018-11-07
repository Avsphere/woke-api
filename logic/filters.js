const filters = {};
const moment = require('moment')



filters.filterDate = (maxYears) => (datas) => datas.filter( ({date_publish}) => {
  const yearsOld = parseInt( moment(date_publish).fromNow(true).split(' ')[0] );
  return yearsOld < maxYears;
});

filters.filterSize = (minSize) => (datas) => datas.filter( d => d.text && d.text.length > minSize )

filters.hasTitle = (datas) => datas.filter( d => d.hasOwnProperty('title') && d.title.length > 5 )
filters.hasImageUrl = (datas) => datas.filter(d => d.hasOwnProperty('image_url') && d.image_url.length > 10 )


module.exports = filters;
