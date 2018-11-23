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
let data = {};

//This just runs the filters, prepares the data for the analysis /  saves the data to gold

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
    data = await helpers.collect(config.dataDir)
    let filteredData = applyFilters(config.filters)

    let polarityData = await jsonFile.readFile(config.polarityFile);
    filteredData = helpers.attachPolarity(filteredData, polarityData)
    filteredData = helpers.removeDupes(filteredData);
    console.log(`Filtered data. Old size: ${data.length}, new size ${filteredData.length}`)
    return filteredData;
  } catch (e) {
    console.error("Ohhhhhhh fuck", e)
  }

}

const setup = async (config) => {
  const filteredData = await siftTrash(config)
  await saveGold(filteredData, config.saveDir)
  return true;
}





const config = {
  dataDir : './data/rawGold',
  saveDir : './data/gold',
  polarityFile : './logic/metaData/polarityData.json',
  filters : [ filters.filterDate(3), filters.filterSize(500), filters.hasTitle, filters.hasImageUrl ]
}
setup(config)
.then( _ => { console.log("all done!"); process.exit(0); })
.catch( e => console.error("Error during setup", e) )
