const helpers = {}

helpers.averageSize = (datas) => {
  return datas.map( d => {
    if ( !d.text ) { return 0; }
    else { return d.text.length; }
  })
  .reduce( (total, next) => total + next) / datas.length;
}

module.exports = helpers;
