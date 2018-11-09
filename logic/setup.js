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
const topicAnalysis = require('./topicAnalysis')
let data = {};

//This just runs the filters and prepares the data for the topic topicAnalysis
//The reason why this doesn't run sequentially is becasue the LDA needs to be hand pruned

const applyFilters = (filterFns) => {
  let filteredData = data;
  filterFns.forEach( fn => {  filteredData = fn(filteredData); console.log("Filter ",  filteredData.length, ' complete!'); } )
  return filteredData;
}



const saveGold = async (filteredData, saveDir) => {
  await helpers.clearDir(saveDir)
  await helpers.saveData(filteredData, saveDir)
}

const siftTrash = async (config) => {
  try {
    console.log(`Beginning collection process ${Date()}`)
    data = await helpers.collect(config.dataDir, true) //true means resursive collect
    const filteredData = applyFilters(config.filters)

    let polarityData = {}
    console.log(`Filtered data. Old size: ${data.length}, new size ${filteredData.length}`)
    if ( config.hasOwnProperty("polarityFile") ) {
      polarityData = await jsonFile.readFile(config.polarityFile);
      helpers.attachPolarity(filteredData, polarityData)
    }
    console.log("Setup complete!")
    return filteredData;
  } catch (e) {
    console.error("Ohhhhhhh fuck", e)
  }

}

const setup = async (config) => {
  const filteredData = await siftTrash(config)
  saveGold(filteredData, config.saveDir)
  return true;
}





const config = {
  dataDir : '../jsonData/',
  saveDir : './data/gold',
  polarityFile : './logic/metaData/polarityData.json',
  filters : [ filters.filterDate(3), filters.filterSize(200), filters.hasTitle, filters.hasImageUrl ]
}
setup(config)
.then( _ => console.log("all done!"))
.catch( e => console.error("Error during setup", e) )
