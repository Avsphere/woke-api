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
let politicalVocabData = path.join(__dirname, './metaData/politicalVocab.json');

const tokenize = (text) => {
  try {
    const tokens = tokenizer.tokenize( text.toLowerCase() );
    return tokens.filter( t => t.length > 3);
  } catch ( e ) {
    console.log("error", text)
  }
}

const processors = (data, additionalStopWords) => {
  additionalStopWords = additionalStopWords || []
  const totalTokenCount = () => data.map( ({text}) => text.length).reduce( (a,b) => a+b )
  const removeStopWords = (data) => {
    data
    .forEach( (doc) => {
      doc.text = stopWords.removeStopwords(tokenize(doc.text) )
      .filter( token => !additionalStopWords.includes(token) )
      .join(' ')
    })
  }
  const buildFreqDict = () => {
    const freq = {}
    const totalTokens = totalTokenCount();
    data.map( doc => tokenize(doc.text) )
    .forEach( tokens => tokens.forEach( token => freq.hasOwnProperty(token) ? freq[token]++ : freq[token] = 1 ) )
    for ( const key in freq ) {
      const count = freq[key]
      freq[key] = { count : count, freq : count / totalTokens }
    }
    return freq
  }
  const addOccursIn = (freqDict) => {
    const dataLength = data.length;
    data.forEach( doc => {
      let text = tokenize(doc.text)
      let uniqueTokens = {}
      text.forEach( token => uniqueTokens[token] ? true : uniqueTokens[token] = true)
      uniqueTokens = Object.keys(uniqueTokens);
      uniqueTokens.forEach( token => {
        freqDict[token].occursIn ? freqDict[token].occursIn++ : freqDict[token].occursIn = 1
      })
    })
  }
  const sortedTokenFrequencies = (countDict) => {
    const freqTups = []
    for ( const token in countDict ) {
      freqTups.push([token, countDict[token] ])
    }
    return freqTups.sort( (a,b) => b[1].count - a[1].count );
  }
  const addProcessedText = (freqDict) => {
    data.forEach( doc => {
      doc.processedText = tokenize(doc.text).filter( t => freqDict[t] ? freqDict[t].count > 10 : false )
    })
  }
  removeStopWords(data)
  const freqDict = buildFreqDict()
  addOccursIn(freqDict) //words at the top were added to stops
  addProcessedText(freqDict);
  const sortedTups = sortedTokenFrequencies(freqDict)
  return data
}
const saveGold = async (data, saveDir) => {
  // await helpers.clearDir(saveDir)
  await helpers.saveData(data, saveDir)
}

const preProcess = async () => {
  try {
    console.log(`Beginning collection process ${Date()}`)
    let data = await helpers.collect(goldDir)
    const politicalVocab = await jsonFile.readFile(politicalVocabData)
    const addStopWords = [
      'will', 'when', 'just', 'says', 'three', 'one', 'two', 'even', 'really', 'need',
      'time', 'first', 'year', 'years', 'back', 'last', 'made', 'know', 'right', 'during',
      'according', 'long', 'going', 'want', 'think', 'around', 'told', 'every', 'things', 'called',
      'doesn', 'little', 'ever', 'again', 'once', 'past', 'actually', 'used'
    ]
    .concat( politicalVocab.houseMembers.map( mem => mem.trim().split(' ') ) )
    data = processors(data, addStopWords);
    await saveGold(data, './data/processedGold')
    console.log("All done!")
    process.exit(0);
  } catch (e) {
    console.error("Ohhhhhhh fuck", e)
  }

}


preProcess()
