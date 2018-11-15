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


const collector = async () => {
  try {
    console.log(`Beginning collection process ${Date()}`)
    const data = await helpers.collect(goldDir)
    console.log(averageDaysOld(data))

  } catch (e) {
    console.error("Ohhhhhhh fuck", e)
  }

}


collector()
