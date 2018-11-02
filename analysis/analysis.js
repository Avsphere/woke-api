const jsonFile = require('jsonfile')
const fs = require('fs')
const path = require('path')
const moment = require('moment')
const filters = require('./filters')
const helpers = require('./helpers')
const lda = require('lda')
const natural = require('natural')
const tokenizer = new natural.WordTokenizer();
const stopWords = require('stopword')

let config = {};
let data = {};

//indp of config
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

const grabData = (fileNames, max) => {
  return new Promise( (resolve, reject) => {
    if ( !max ) { max = fileNames.length-1; }
    Promise.all( fileNames.splice(0, max).map( f => jsonFile.readFile(f) ) )
    .then(resolve)
    .catch(reject)
  })
}

const fileNames = () => {
  return new Promise( (resolve, reject) => {
    fs.readdir(config.dataDir, (err, files) => {
      if ( err) { reject(err) }
      resolve(files.filter( f => f.includes('.json') ).map( f => path.join(config.dataDir, f) ))
    })
  })
}

const saveData = () => {
  const promisedWrites = []
  data.forEach( d => {
    let base = d.title.trim().replace(/[^A-Za-z0-9]/g, '').split(/\s+/).join('_') + '.json';
    if ( base.length > 6 ) {
      let filename = path.join(config.saveDir, base)
      d.filename = filename;
      promisedWrites.push( jsonFile.writeFile(filename, d) )
    }
  })
  return Promise.all(promisedWrites)
}

const applyFilters = () => {
  let filteredData = data;
  config.filters.forEach( fn => { filteredData = fn(filteredData) } )
  return filteredData;
}

const collect = () => {
  return new Promise( (resolve, reject) => {
    fileNames(config.dataDir)
    .then(f => grabData(f, config.collectionSize || 0) )
    .then(resolve)
    .catch(reject)
  })
}
//using bodies top 5 and title ... still kind of shitty
const topicAnalysis = async (filteredData, clusters, topics) => {
  const buildTokenCollection = (nBodyTokens) => {
      return filteredData.map( d => {
      let title = tokenizer.tokenize(d.title)
      let body = tokenizer.tokenize(d.text)

      body = stopWords.removeStopwords(body).filter(t => t.length > 3);
      title = stopWords.removeStopwords(title).filter(t => t.length > 3)
      let topBodyTokens = mostFrequentTokens(body, nBodyTokens, true);
      let tokensForTopicAnalysis = title.concat(topBodyTokens).join(' ')
      return tokensForTopicAnalysis;
  })
}
  return lda(buildTokenCollection(5), clusters, topics)
}

const parseText = (documents, removeStops) => {
  removeStops = removeStops || false;
  let parsedData = documents.map( d => tokenizer.tokenize(d) )
  if ( removeStops ) {
    parsedData = parsedData.map( d => stopWords.removeStopwords(d).filter(t => t.length > 3) )
  }
  return parsedData
}

const mostFrequentTokens = (tokens, n, justTokens ) => {
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

const masterCommander = async (params) => {
  config = params;
  data = await collect()
  const filteredData = applyFilters()
  const topics = await topicAnalysis(filteredData, 10 , 1)
  console.log(topics)

  // await clearDir(config.saveDir)
}

masterCommander({
  dataDir : './data/json/miniSample',
  saveDir : './data/filteredJson',
  filters : [ filters.filterDate(5), filters.filterSize(500) ]
});
