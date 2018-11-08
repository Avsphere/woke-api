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


/*
  This is a curried approach to tracking the important of the political words
  Leading to adjustment in the word important
  ie if trump scores highly across many documents then the importance is validated

*/

const importanceReferee = (mappedPoliticalWords) => {
  const scoreDict = {}
  for ( const key in mappedPoliticalWords ) {
    scoreDict[key] = 0;
  }
  return {
    increment : (word) => { scoreDict[word]++ },
    get : (w) => scoreDict,
    getSorted : (w) => {
      const pairs = []
      for ( const key in scoreDict ) {
        pairs.push( [key, scoreDict[key] ] )
      }
      pairs.sort( (a,b) => b[1] - a[1] )
      return pairs;
    }
  }
}


const mapImportance = async () => {
  const troubleWords = ['will', 'moon']
  const politicalVocab = await jsonFile.readFile(politicalVocabPath)
  //This function splits each set of words into a single word so i dont have to check n gram permutations ie the political phrase "Rubber and Chicken Circuit" becomes ['rubber', 'chicken', 'circuit']
  const politicalVocabFixer = () => {
    for ( const key in politicalVocab ) {
      politicalVocab[key] = politicalVocab[key]
      .map( w => w.toLowerCase().split(' ').filter( w => w.length > 3 && !troubleWords.includes(w) ) )
      .reduce( (acc, el) => acc.concat(el), [])
    }
  }
  const collectAllTerms = () => {
    let terms = {}
    politicalVocab.words.forEach( w => {
      terms[w] = 2
    })
    politicalVocab.highWords.forEach( w => {
      terms[w] = 4
    })
    politicalVocab.senateMembers.forEach( w => {
      terms[w] = 3
    })
    politicalVocab.houseMembers.forEach( w => {
      terms[w] = 3
    })
    politicalVocab.powerfulPeoples.forEach( w => {
      terms[w] = 4
    })
    politicalVocab.organizations.forEach( w => {
      terms[w] = 4
    })
    return terms;
  }
  politicalVocabFixer();
  return collectAllTerms();
}

const testRef = async() => {
  let mapped = await mapImportance()
  let reff = importanceReferee(mapped);
  reff.increment('fifa')
  console.log(reff.get())
}


const topicAnalysis = async (filteredData) => {
  const rankDocs = (mappedVocab, ref) => {
    const scoredDocs = filteredData.map( d => {
      const tokenize = (text) => {
        const tokens = tokenizer.tokenize( text.toLowerCase() );
        return tokens.filter( t => t.length > 3 );
      }
      const computeScores = (tokens) => tokens.map( t => {
        if ( mappedVocab.hasOwnProperty(t) ) {
          ref.increment(t);
          return mappedVocab[t]
        }
        return 0;
      }).reduce( (a,b) => a + b)

      const tokens = tokenize(d.text);
      const rawScore = computeScores(tokens)
      d.score = computeScores(tokens)
      return d;
    })

    const ranked = scoredDocs.sort( (a,b) => b.score - a.score )
    return ranked;
  }
  const mappedVocab = await mapImportance()
  const ref = importanceReferee(mappedVocab)
  return {
    rankedDocs : rankDocs(mappedVocab, ref),
    ref : ref
  }
}


const run = async() => {
  const data = await helpers.collect(goldDir)
  const sampleSet = data;
  const results = await topicAnalysis(sampleSet)
  results.rankedDocs.splice(0,50).forEach( doc => console.log(doc.title, ' : ', doc.score ) )
  return results
}

run()





// testRef();
module.exports = topicAnalysis;
