const jsonFile = require('jsonfile')
const fs = require('fs')
const path = require('path')
const lda = require('lda')
const natural = require('natural')
const tokenizer = new natural.WordTokenizer();
const stopWords = require('stopword')
const url = require('url')
const recursiveRead = require('recursive-readdir')
const helpers = {}


const getFileNames = (directory, recurse) => {
  let readFn = fs.readdir;
  return new Promise( (resolve, reject) => {
    if ( recurse ) { readFn = recursiveRead; }
    readFn(directory, (err, files) => {
      if ( err) { reject(err) }
      const filteredFiles = files.filter( f => path.extname(f) == '.json' ).map( f => path.join(directory, f) )
      resolve( filteredFiles )
    })
  })
}
const grabData = (fileNames, max) => {
  if ( max ) { fileNames = fileNames.splice(0, max); }
  return new Promise( (resolve, reject) => {
    if ( !max ) { max = fileNames.length-1; }
    Promise.all( fileNames.map( f => jsonFile.readFile(f) ) )
    .then(resolve)
    .catch(reject)
  })
}


const clearDir = (dirName) => {
  return new Promise( (resolve, reject) => {
    fs.readdir(dirName, (err, files) => {
      if ( err ) { reject(err); }
      const promises = files.map( f => {
        return new Promise( (resolve, reject) => {
          fs.unlink(path.join(dirName, f), (err) => {
            if ( err ) { reject(err); }
            resolve(true);
          })
        })
      })
      Promise.all(promises)
      .then( resolve(true) )
      .catch( e => reject(e) )
    })
  })
}

const saveData = (data, directory) => {
  const promisedWrites = []
  data.forEach( (d,i) => {
    let filename = d.title.trim().replace(/[^A-Za-z0-9]/g, '').split(/\s+/).join('_') + `_${i}` + '.json';
    let saves = {}
    if ( filename.length > 6 && !saves.hasOwnProperty(filename) ) {
      saves[filename] = true;
      let localpath = path.join(directory, filename)
      d.filename = filename;
      d.localpath = filename;
      promisedWrites.push( jsonFile.writeFile(localpath, d) )
    }
  })
  return Promise.all(promisedWrites)
}

helpers.attachPolarity = ( data, polarityData ) => {
  const augmentedData = data.map( d => {
    const sourceDomain = d.source_domain.trim().toLowerCase()
    const polarityScore = polarityData.find( p => {
      const polaritySource = url.parse(p.sourceUrl.trim()).hostname.toLowerCase();
      if ( polaritySource.includes(sourceDomain) ) { return true; }
      else { return false; }
    })
    if ( !polarityScore ) {
      // console.log("There is no polairty information for:", sourceDomain);
    }


    d.polarityScore = polarityScore || {};
  })
  return augmentedData;
}

helpers.collect = (directory, recurse) => {
  return new Promise( (resolve, reject) => {
    getFileNames(directory, recurse)
    .then(f => grabData(f) )
    .then(resolve)
    .catch(reject)
  })
}

//analysis helpers
helpers.averageSize = (datas) => {
  return datas.map( d => {
    if ( !d.text ) { return 0; }
    else { return d.text.length; }
  })
  .reduce( (total, next) => total + next) / datas.length;
}

helpers.parseText = (documents, removeStops) => {
  removeStops = removeStops || false;
  let parsedData = documents.map( d => tokenizer.tokenize(d) )
  if ( removeStops ) {
    parsedData = parsedData.map( d => stopWords.removeStopwords(d).filter(t => t.length > 3) )
  }
  return parsedData
}
helpers.getRandomInt = (max) => Math.floor( Math.random() * Math.floor(max) )
helpers.mostFrequentTokens = (tokens, n, justTokens ) => {
  if ( n > tokens.length ) { n = tokens.length-1; }
  const freq = {}
  const tupelized = []
  tokens.forEach( t => {
    t = t.toLowerCase()
    freq[t] = (freq[t] || 0) + 1
  })
  for ( const f in freq ) {
    tupelized.push([f, freq[f] ])
  }
  tupelized.sort( (a ,b) => b[1] - a[1])
  if ( justTokens ) {
    return tupelized.map( tuple => tuple[0] ).splice(0,n);
  }
  return tupelized.splice(0, n)
}

helpers.grabData = grabData;
helpers.getFileNames = getFileNames;
helpers.clearDir = clearDir;
helpers.saveData = saveData;
module.exports = helpers;
