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

let goldDir = path.join(__dirname, '../data/gold');


const tokenize = (text) => {
  try {
    const tokens = tokenizer.tokenize( text.toLowerCase() );
    return tokens.filter( t => t.length > 3 );
  } catch ( e ) {
    console.log("error", text)
  }
}

const averageTextLength = ( data ) => {
  return data
  .filter( d => d.text && d.text.length )
  .map( d => tokenize(d.text) )
  .reduce( (a,b) => {
    if ( a.length ) { return a.length + b.length; }
    else { return a + b.length }
  }) / data.length
}

const averageDaysOld = ( data ) => {
  return data
  .map( ({date_publish}) =>  moment().diff(date_publish, 'days') )
  .reduce( (a,b) => a + b) / data.length
}

const tokenFrequency = (data) => {
  const freqDict = {}
  const freqTups = []
  const additionalStopWords = ['will', 'when', 'just', 'first', 'even', 'during', 'back', 'says']
  data
  .filter( ({text, description}) => text && description && description.length )
  .map( ({text, description}) => tokenize(text).concat( tokenize(description) ) )
  .map( tokens => stopWords.removeStopwords(tokens).filter( token => !additionalStopWords.includes(token)) )
  .forEach( tokens => {
    tokens.forEach( t => {
      freqDict.hasOwnProperty(t) ? freqDict[t]++ : freqDict[t] = 1
    })
  })
  for ( const token in freqDict ) {
    freqTups.push([token, freqDict[token] ])
  }
  console.log('sessions', freqDict['sessions'])
  return freqTups.sort( (a,b) => b[1] - a[1] );
}

const averagePolarity = (data) => {
  return data
  .map( ({polarityScore}) => parseInt(polarityScore.communityAgree) + parseInt(polarityScore.communityDisagree)  )
  .reduce( (a,b) => a + b) / data.length
}



const collector = async () => {
  try {
    console.log(`Beginning collection process ${Date()}`)
    const data = await helpers.collect(goldDir)
    // console.log(averageDaysOld(data))
    // const testData = data.filter( ({filename}) => filename == 'ZooAtlantapandatwinsgrowingtoobigtohandle_4607.json' )
    // console.log( tokenFrequency(testData) )
    console.log( averagePolarity(data) )


  } catch (e) {
    console.error("Ohhhhhhh fuck", e)
  }

}


collector()
