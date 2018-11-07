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
const flat = require('flat')

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
      return { [w] : 5 }
    }),
    organizations : politicalVocab.organizations.map( w => {
      return { [w] : 4 }
    })
  }
}


const politicalVocabFixer = async() => {
  const politicalVocab = await jsonFile.readFile(politicalVocabPath)
  politicalVocab.words = politicalVocab.words.map
}


const topicAnalysis = async (filteredData) => {
  const rankDocs = (vocabRankings) => {
    const ranked = filteredData.map( d => {
      const tokenize = (text) => {
        text = d.text.toLowerCase()
        const tokens = tokenizer.tokenize(text);
        return tokens.filter( t => t.length > 3 );
      }
      const computeScore = (tokens) => {

      }
      const tokens = tokenize(d.text);
      const bigrams = natural.NGrams.bigrams(tokens);


      console.log(ngrams);

    })
  }
  const mappedVocab = await mapImportance()
  rankDocs(mappedVocab)
  return true;
}

const run = async() => {
  const data = await helpers.collect(goldDir)
  const sampleSet = data.splice(0,3);
  topicAnalysis(sampleSet)
  console.log(sampleSet)
}

run();


module.exports = topicAnalysis;
