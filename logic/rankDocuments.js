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

//globals
const politicalVocabPath = path.join(__dirname, './metaData/politicalVocab.json')
const goldDir = path.join(__dirname, '../data/gold');


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

const mapImportance = async () => {
  const politicalVocabFixer = (politicalVocab) => {
    const troubleWords = [
      'will', 'moon', 'young', 'love', 'john', 'kind', 'jason', 'brown', 'jack', 'david', 'black', 'hill', 'jeff', 'johnson', 'matt', 'scott', 'thomas',
      'dark', 'ryan', 'holding', 'william', 'paul', 'inside', 'room', 'chicken', 'brian', 'long', 'michael', 'james', 'moore', 'stores', 'eric', 'know'
    ]
    for ( const key in politicalVocab ) {
      politicalVocab[key] = politicalVocab[key]
      .map( w => w.toLowerCase().split(' ').filter( w => w.length > 3 && !troubleWords.includes(w) ) )
      .reduce( (acc, el) => acc.concat(el), [])
    }
  }
  let politicalVocab = await jsonFile.readFile(politicalVocabPath)
  //This function splits each set of words into a single word so i dont have to check n gram permutations ie the political phrase "Rubber and Chicken Circuit" becomes ['rubber', 'chicken', 'circuit']
  politicalVocabFixer(politicalVocab);
  const collectAllTerms = () => {
    let terms = {}
    politicalVocab.words.forEach( w => {
      terms[w] = 3
    })
    politicalVocab.highWords.forEach( w => {
      terms[w] = 15
    })
    politicalVocab.senateMembers.forEach( w => {
      terms[w] = 4
    })
    politicalVocab.houseMembers.forEach( w => {
      terms[w] = .5
    })
    politicalVocab.powerfulPeoples.forEach( w => {
      terms[w] = 8
    })
    politicalVocab.organizations.forEach( w => {
      terms[w] = 8
    })
    return terms;
  }
  return collectAllTerms();
}
const rankDocs = async (filteredData) => {
  const avgPopularityScore = filteredData.map( ({polarityScore}) => parseInt(polarityScore.communityAgree) + parseInt(polarityScore.communityDisagree)  ).reduce( (a,b) => a + b) / filteredData.length;
  const computeScore = (mappedVocab, judge) => {
    const scoredDocs = filteredData.map( d => {
      const tokenize = (text) => {
        const tokens = tokenizer.tokenize( text.toLowerCase() ).splice(0,500);
        return tokens.filter( t => t.length > 3 );
      }
      const compute = (tokens) => tokens.map( t => {
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
      const rawScore = compute(tokens)
      let rawPopularityMultiplier = ( parseInt(d.polarityScore.communityAgree) + parseInt(d.polarityScore.communityDisagree) ) / avgPopularityScore;
      let weightedPopularity = rawPopularityMultiplier / 6;
      if ( weightedPopularity < 1 ) { weightedPopularity = 1; }
      const weightedScore = rawScore * weightedPopularity
      d.scores = { weightedScore : weightedScore, textLength : tokens.length, rawScore : rawScore, rawPopularityMultiplier : rawPopularityMultiplier, weightedPopularity : weightedPopularity }
      return d;
    })

    const ranked = scoredDocs.sort( (a,b) => b.scores.weightedScore - a.scores.weightedScore )
    return ranked;
  }
  const mappedVocab = await mapImportance()
  const judge = ImportantanceJudge(mappedVocab);
  const rankedDocs = computeScore(mappedVocab,  judge)
  return {
    rankedDocs : rankedDocs,
    judge : judge
  }
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
const buildRankings = async() => {
  let data = await helpers.collect(goldDir)
  const rankedDocs = await rankDocs(data)
  const topDocs = []
  rankedDocs.rankedDocs.forEach( d => topDocs.push({ "filename" : d.filename, "score" : d.scores }) )
  // await jsonFile.writeFile(path.join(__dirname, './metaData/metaRankedDocs.json'), topDocs)
  let lefts = []
  let rights = []
  for ( let i = 0; i < rankedDocs.rankedDocs.length; i++ ) {
    let doc = rankedDocs.rankedDocs[i];
    if ( doc.polarityScore.allSidesBias === 'left' || doc.polarityScore.allSidesBias == 'left-center') {
      lefts.push(doc);
    } else if ( doc.polarityScore.allSidesBias === 'right' || doc.polarityScore.allSidesBias === 'right-center' ) {
      rights.push(doc)
    }
    if ( lefts.length >= 20 && rights.length >= 20 ) { break; }
  }

  const shuffled = shuffle(lefts.concat(rights)).map( doc => {
    const bias =  doc.polarityScore.allSidesBias;
    return { title : doc.title, text : doc.text.substring(0, 250), bias : bias }
  })
  await jsonFile.writeFile(path.join(__dirname, './metaData/shuffleTest.json'), shuffled)
  return rankedDocs
}

buildRankings();

module.exports = buildRankings;
