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
const politicalVocabPath = './data/politicalVocab.json'
const goldDir = './data/gold'
/*
The current method in use:
1. Takes the below lists of senate members, top names in politics, house members, politically charged words
2. Assigns an importance score to each word (proper nouns are higher signals)
3. Gives each document a score then returns this log(score)
4. Creates subsets of documents by their importance scores
5. runs lda on subset
*/


//
// const topicAnalysis = async (filteredData, clusters, topics) => {
//   const buildTokenCollection = (nBodyTokens) => {
//       return filteredData.map( d => {
//       let title = tokenizer.tokenize(d.title)
//       let body = tokenizer.tokenize(d.text)
//
//       body = stopWords.removeStopwords(body).filter(t => t.length > 3);
//       title = stopWords.removeStopwords(title).filter(t => t.length > 3)
//       let topBodyTokens = requentTokens(body, nBodyTokens, true);
//       let tokensForTopicAnalysis = title.concat(topBodyTokens).join(' ')
//       return tokensForTopicAnalysis;
//   })
// }
//   return lda(buildTokenCollection(5), clusters, topics)
// }

const mapImportance = async () => {
  const politicalVocab = await jsonFile.readFile(politicalVocabPath)

  return {
    words : politicalVocab.words.map( w => {
      return { [w] : 1 }
    }),
    senateMembers : politicalVocab.senateMembers.map( w => {
      return { [w] : 3 }
    }),
    houseMembers : politicalVocab.houseMembers.map( w => {
      return { [w] : 3 }
    }),
    powerfulPeoples : politicalVocab.powerfulPeoples.map( w => {
      return { [w] : 3 }
    })
  }

}


const topicAnalysis = async (filteredData) => {
  const mappedVocab = await mapImportance()
  console.log(mappedVocab)
}

const run = async() => {
  const data = await helpers.collect(goldDir)
  topicAnalysis(data)
  console.log(data)
}

run();


module.exports = topicAnalysis;
