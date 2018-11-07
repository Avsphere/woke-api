const Article = require('./article');
const mongoose = require('mongoose');
const jsonfile = require('jsonfile');
const helpers = require('../logic/helpers')
const path = require('path');
require('dotenv').config()
mongoose.connect(process.env.DB_CONN, { useNewUrlParser : true }).then(
  () => { console.log("Connected and seeding!"); runSeed(true); },
  err => { console.log("ERROR - Database connection failed")}
)

const runSeed = (emptyFirst) => {
  clearCollection(Article)
  // .then( () => dropIndexes(Articles) )
  .then( () => seed() )
  .then( () => { console.log('Seed success!'); process.exit(0); })
  .catch( (e) => console.error('Error in seeding', e))
}

const clearCollection = (Model) => {
  return new Promise( (resolve, reject) => {
    Model.deleteMany({}, err => {
      if ( err ) { console.error(err); }
      else { console.log(Model.modelName, "Collection cleared!"); resolve(true); }
    })
  })
}
const dropIndexes = (Model) => {
  return new Promise( (resolve, reject) => {
    Model.collection.dropIndexes(err => {
      if ( err ) { console.error(err); }
      else { console.log(Model.modelName, "Dropped indexes!"); resolve(true); }
    })
  })
}
const seed = () => {
  const savePromises = [];
  return new Promise( (resolve, reject) => {
    helpers.collect( path.join(__dirname, '../data/gold') )
    .then( data => data.map( d => new Article(d) ) )
    .then( articles => articles.map( a => a.save() ) )
    .then( saves => Promise.all(saves).then( s => resolve(true) ) )
    .catch( e => reject(e) )
  })
}
