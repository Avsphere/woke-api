const filters = {};
const moment = require('moment')
const natural = require('natural')
const tokenizer = new natural.WordTokenizer();

filters.filterDate = (maxYears) => (datas) => datas.filter( ({date_publish, localpath}) => {
  if ( !date_publish ) { return false; }
  const yearsOld = parseInt( moment(date_publish).fromNow(true).split(' ')[0] ) || false;
  return yearsOld < maxYears;
});

filters.filterSize = (minSize) => (datas) => datas.filter( d => {
  if ( d.text ) {
    const tokens = tokenizer.tokenize(d.text);
    console.log(tokens.length)
    return tokens.length > minSize;
  } else {
    return false
  }

})

filters.hasTitle = (datas) => datas.filter( d => d.hasOwnProperty('title') && d.title.length > 5 )
filters.hasImageUrl = (datas) => datas.filter(d => d.hasOwnProperty('image_url') && d.image_url.length > 10 )


module.exports = filters;
