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



const topicAnalysis = async (filteredData, clusters, topics) => {
  const buildTokenCollection = () => {
      return filteredData.map( d => {
      let body = tokenizer.tokenize(d.text)
      return stopWords.removeStopwords(body).filter(t => t.length > 3).join(' ');
  })
}
  const tokenCollection = buildTokenCollection(5)
  return lda(tokenCollection, clusters, topics)
}


/*
  This is a curried approach to tracking the important of the political words
  Leading to adjustment in the word important
  ie if trump scores highly across many documents then the importance is validated

*/

const ImportantanceJudge = (mappedPoliticalWords) => {
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

const mapImportance = async () => {
  let politicalVocab = await jsonFile.readFile(politicalVocabPath)
  //This function splits each set of words into a single word so i dont have to check n gram permutations ie the political phrase "Rubber and Chicken Circuit" becomes ['rubber', 'chicken', 'circuit']
  politicalVocabFixer(politicalVocab);
  const collectAllTerms = () => {
    let terms = {}
    politicalVocab.words.forEach( w => {
      terms[w] = 3
    })
    politicalVocab.highWords.forEach( w => {
      terms[w] = 20
    })
    politicalVocab.senateMembers.forEach( w => {
      terms[w] = 4
    })
    politicalVocab.houseMembers.forEach( w => {
      terms[w] = 2
    })
    politicalVocab.powerfulPeoples.forEach( w => {
      terms[w] = 6
    })
    politicalVocab.organizations.forEach( w => {
      terms[w] = 6
    })
    return terms;
  }

  return collectAllTerms();
}



const rankDocuments = async (filteredData) => {
  const rankDocs = (mappedVocab, judge) => {
    const scoredDocs = filteredData.map( d => {
      const tokenize = (text) => {
        const tokens = tokenizer.tokenize( text.toLowerCase() );
        return tokens.filter( t => t.length > 3 );
      }
      const computeScores = (tokens) => tokens.map( t => {
        if ( mappedVocab.hasOwnProperty(t) ) {
          judge.increment(t);
          return mappedVocab[t]
        }
        return 0;
      }).reduce( (a,b) => a + b)

      const tokens = tokenize(d.text);
      if ( tokens.length === 0 ) {
        d.scores = { score : 0, textLength : 0, rawScore : 0 };
        return d;
      }
      const rawScore = computeScores(tokens)
      const weightedScore = rawScore / (tokens.length / 3)
      d.scores = { score : rawScore / (tokens.length / 3) , textLength : tokens.length, rawScore : rawScore }
      return d;
    })

    const ranked = scoredDocs.sort( (a,b) => b.scores.score - a.scores.score )
    return ranked;
  }
  const mappedVocab = await mapImportance()
  const judge = ImportantanceJudge(mappedVocab);
  const rankedDocs = rankDocs(mappedVocab,  judge)
  return {
    rankedDocs : rankedDocs,
    judge : judge
  }
}

const placeDocuments = async (documents) => {
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


const buildRankings = async() => {
  const data = await helpers.collect(goldDir)
  const rankedResults = await rankDocuments(data)
  const topDocs = []
  rankedResults.rankedDocs.forEach( d => topDocs.push({ "filename" : d.localpath, "score" : d.scores }) )
  jsonFile.writeFile('./logic/metaData/rankedDocs.json', topDocs)
  console.log(rankedResults.judge.getSorted())
  return rankedResults
}

const buildTopics = async (rankedDocsPath) => {
  const rankedDocs = await jsonFile.readFile('./logic/metaData/rankedDocs.json')
  const sampleSize = 200;
  const filenames = rankedDocs.splice(0,sampleSize).map( d => d.filename )
  const sample = await Promise.all( filenames.map( f => jsonFile.readFile('./data/gold/' + f ) ) )
  const topics = []
  for ( let i = 0; i < 2; i++ ) {
    const clusters = 3;
    const terms = 20;
    const topicGuess = await topicAnalysis(sample, clusters , terms)
    topics.push( { topic : topicGuess, params : { clusterSize : clusters, terms : terms, sampleSize : sampleSize, iteration : i } })
  }
  jsonFile.writeFile('./logic/metaData/topics.json', topics)
}

//This is a subjective pruning for the lda results
const selectDocuments = async( rankedDocsPath) => {
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

// buildRankings();
// buildTopics();
selectDocuments()
module.exports = {
  buildRankings : buildRankings
};
