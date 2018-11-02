const jsonFile = require('jsonfile')
const fs = require('fs')
const dataFolder = '../json/data/';
const consumptionFolder = './data/vaneerConsumption/';
const path = require('path')
const moment = require('moment')
const filters = require('./filters')
const stats = require('./stats')


const fileNames = () => {
  return new Promise( (resolve, reject) => {
    fs.readdir(dataFolder, (err, files) => {
      if ( err) { reject(err) }
      resolve(files.filter( f => f.includes('.json') ).map( f => path.join(dataFolder, f) ))
    })
  })
}

const grabData = (fileNames, max) => {
  return new Promise( (resolve, reject) => {
    if ( !max ) { max = fileNames.length-1; }
    Promise.all( fileNames.splice(0, max).map( f => jsonFile.readFile(f) ) )
    .then(resolve)
    .catch(reject)
  })
}







const collectAndParse = () => {
  return new Promise( (resolve, reject) => {
    fileNames()
    .then(f => grabData(f) )
    .then(datas => filterDate(datas, 5) )
    .then(datas => filterSize(datas, 500) )
    .then(resolve)
    .catch(reject)
  })
}


const vaneer = async () => {
  const promisedWrites = []
  let data = await collectAndParse()
  data.forEach( d => {
    let base = d.title.trim().replace(/[^A-Za-z0-9]/g, '').split(/\s+/).join('_') + '.json';
    if ( base.length > 5 ) {
      let filename = path.join(consumptionFolder, base)
      d.filename = filename;
      promisedWrites.push( jsonFile.writeFile(filename, d) )
    }
  })
  Promise.all(promisedWrites)
  .then( res => {
    console.log("Vaneer complete!")
  })
  .catch ( e => console.error("VANEER FAILED", e) )
}

vaneer();
