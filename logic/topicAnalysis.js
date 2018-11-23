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

const politicalVocabPath = './logic/metaData/politicalVocab.json'
const goldDir = './data/gold'
/*
The current method in use:
1. Takes the below lists of senate members, top names in politics, house members, politically charged words
2. Assigns an importance score to each word (proper nouns are higher signals)
3. Gives each document a score then returns this log(score)
4. Creates subsets of documents by their importance scores
5. runs lda on subset
*/




const politicalVocabFixer = (politicalVocab) => {
  const troubleWords = [
    'will', 'moon', 'young', 'love', 'john', 'kind', 'jason', 'brown', 'jack', 'david', 'black', 'hill', 'jeff',
    'dark', 'ryan', 'holding', 'william', 'paul', 'inside', 'room', 'chicken', 'brian', 'catholic', 'church'
  ]
  for ( const key in politicalVocab ) {
    politicalVocab[key] = politicalVocab[key]
    .map( w => w.toLowerCase().split(' ').filter( w => w.length > 3 && !troubleWords.includes(w) ) )
    .reduce( (acc, el) => acc.concat(el), [])
  }
}

const topics = {
  trump : [ ["trump", 8], ["donald", 8], ["president", 8],  ],
  entertainment : [
    ["fans", 8], ["field", 5], ["season", 5], ["sports", 5], ["sport", 5], ["football", 5], ["soccer", 5], ["baseball", 5], ["cricket", 9], ["show", 9], ["hollywood", 9],
    ["rugby", 9], ["players", 3], ["volleyball", 9], ["stadium", 5], ["jersey", 3], ["jerseys", 3], ["game", 2], ["theatre", 12], ["actor", 8], ["movie", 9], ["entertainment", 9],
  ],
  domestic : [
    ["gates", 8], ["congressman", 12], ["kavanaugh", 8], ["facebook", 8],  ["church", 8], ["states", 8], ["democrat", 8], ["republican", 8], ["government", 1], ["investors", 2],
    ["election", 4], ["vote", 8], ["marijuana", 7 ], ["legalize", 5 ], ["california", 9 ], ["abortion", 12 ], ["millennials", 6 ], ["medicaid", 6 ], ["medicare", 10 ]
 ],
 technology : [
  ["facebook", 5], ["gates", 6],["ai", 12], ["apple", 7], ["electric", 8], ["electricity", 5], ["zuckerberg", 8 ], ["elon", 8 ], ["musk", 8 ], ["amazon", 6 ], ["digital", 8 ], ["google", 8 ],
  ["accounts", 8 ], ["twitter", 2], ["microsoft", 8 ], ["spam", 3 ], ["self-driving", 15 ], ["solar", 6 ], ["computer", 2 ], ["iphone", 6 ],
 ],
  world : [["islamic",1],["pakistan",1],["iraq",1],["korea",1],["north",1],["communism",1],["communist",1],["european",1],["europe",1],["germany",1],["china",1],["russia",1],["united",1],["states",1],["germany",1],["saudi",1],["arabia",1],["india",1],["france",1],["kingdom",1],["china",1],["iran",1],["european",1],["central",1],["international",1],["israel",1],["european",1],["korea",1],["japan",1],["arab",1],["emirates",1],["japan",1],["egypt",1],["turkey",1],["brazil",1],["canada",1],["singapore",1],["mexico",1],["pakistan",1],["indonesia",1], ["london",1],["brexit",1]]
}


const topicCounter = {}

const placeDocuments = async (documents) => {
  let politicalVocab = await jsonFile.readFile(politicalVocabPath)
  politicalVocabFixer(politicalVocab);
  // ['church', 'states'].concat(politicalVocab.states).concat(politicalVocab.houseMembers)
  const worldSignals = ['islamic', 'pakistan', 'iraq', 'korea', 'north', 'communism', 'communist', 'european', 'europe', 'germany'].concat(politicalVocab.organizations)
  documents.forEach( d => {
    d.topicScores = {}
    const tokenize = (text) => {
      const tokens = tokenizer.tokenize( text.toLowerCase() );
      return tokens
    }
    const computeScores = (tokens) => {
      for ( const topic in topics ) {
        d.topicScores[topic] = 0
        const topicSignalTuples = topics[topic];
        const topicTotalWeights = topicSignalTuples.reduce( (a, b) => Array.isArray(a) ? a[1] + b[1] : a + b[1] )

        topicSignalTuples.forEach( signalTuple => {
          const signalToken = signalTuple[0];
          const signalWeight = signalTuple[1];
          tokens.forEach( t => {
            if ( t == signalToken ) {
              d.topicScores[topic] += signalWeight/topicTotalWeights*Math.pow(topicSignalTuples.length, .5) //as the signal count goes up each signal is weighted more, but proportional to its sq
            }
          })
        })


      }
    }


    const tokens = tokenize(d.text).splice(0,500); //equalish footing for all
    computeScores(tokens);
  })
  documents.forEach( d => {
    const topScoring = { topic : '', score : 0 }
    for ( const topicName in d.topicScores ) {
      if ( d.topicScores[topicName] > topScoring.score ) { topScoring.topic = topicName; topScoring.score = d.topicScores[topicName] }
    }
    d.topic = topScoring.topic
    topicCounter.hasOwnProperty(d.topic) ? topicCounter[d.topic]++ : topicCounter[d.topic] = 0
  })
  return documents;
}


const placeDocumentsOld = async (documents) => {
  let politicalVocab = await jsonFile.readFile(politicalVocabPath)
  politicalVocabFixer(politicalVocab);
  const trumpSignals = ['trump', 'president', 'donald']
  const domesticSignals = ['church', 'states'].concat(politicalVocab.states).concat(politicalVocab.houseMembers)
  const worldSignals = ['islamic', 'pakistan', 'iraq', 'korea', 'north', 'communism', 'communist', 'european', 'europe', 'germany'].concat(politicalVocab.organizations)
  documents.forEach( d => {
    d.topicScores = {
      trumpTopic : 0,
      domesticTopic : 0,
      worldTopic : 0
    }
    const tokenize = (text) => {
      const tokens = tokenizer.tokenize( text.toLowerCase() );
      return tokens.filter( t => t.length > 3 );
    }
    const computeScores = (tokens) => tokens.forEach( t => {
      //running an else if to try and reduce overlap
      if ( trumpSignals.includes(t) ) {
        d.topicScores.trumpTopic++;
      } else if ( domesticSignals.includes(t) ) {
        //I weight domestic signals a little less because the size is much larger
        d.topicScores.domesticTopic += .7;
      } else if ( worldSignals.includes(t) ) {
        d.topicScores.worldTopic++;
      }
    })

    const tokens = tokenize(d.text);
    computeScores(tokens);
    if ( d.topicScores.trumpTopic > d.topicScores.domesticTopic && d.topicScores.trumpTopic > d.topicScores.worldTopic ) { d.topicScores.topic = 'trumpTopic' }
    else if ( d.topicScores.domesticTopic > d.topicScores.trumpTopic && d.topicScores.domesticTopic > d.topicScores.worldTopic ) { d.topicScores.topic = 'domesticTopic' }
    else { d.topicScores.topic = 'worldTopic' }

  })
  return documents;
}


const selectDocuments = async(options) => {
  console.log("Les do this")
  options = options || {}
  const saveDbReady = async (data, saveDir) => {
    await helpers.clearDir(saveDir)
    await helpers.saveData(data, saveDir)
  }
  const rankedDocs = await jsonFile.readFile('./logic/metaData/metaRankedDocs.json')
  const sampleSize = options.sampleSize || rankedDocs.length;
  let documentSet = await Promise.all( rankedDocs.splice(0, sampleSize).map( async(f) => {
    const fData = await jsonFile.readFile('./data/gold/' + f.filename )
    fData.score = f.score;
    return fData;
  }) )
  console.log(`Collected ${documentSet.length} documents`)
  const results = await placeDocuments(documentSet)
  await saveDbReady(results, './data/dbReady')
  // let testingResults = results.sort( (a,b) => b.topicScores.technology - a.topicScores.technology  )
  console.log(topicCounter)
  // testingResults = testingResults.splice(0, 100).forEach( result => {
  //   console.log(result.title, result.topicScores, result.topic)
  //
  // })
  console.log("Documents have been selected and are ready for seeding!")
}
//This is a subjective pruning for the lda results
const selectDocumentsOld = async( rankedDocsPath) => {
  const saveDbReady = async (data, saveDir) => {
    await helpers.clearDir(saveDir)
    await helpers.saveData(data, saveDir)
  }
  const rankedDocs = await jsonFile.readFile('./logic/metaData/rankedDocs.json')
  const sampleSize = 5000;

  const sampleSet = await Promise.all( rankedDocs.splice(0, sampleSize).map( async(f) => {
    const fData = await jsonFile.readFile('./data/gold/' + f.filename )
    fData.score = f.score;
    return fData;
  }) )
  const results = await placeDocuments(sampleSet)
  await saveDbReady(results, './data/dbReady')
  console.log("Documents have been selected and are ready for seeding!")
}

selectDocuments()
// selectDocuments({sampleSize : 10000})
