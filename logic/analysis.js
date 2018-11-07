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
const polarityFile = './data/polarityData.json'

let data = {};


const applyFilters = (filterFns) => {
  let filteredData = data;
  filterFns.forEach( fn => { filteredData = fn(filteredData) } )
  return filteredData;
}



const saveGold = async (data, saveDir) => {
  await helpers.clearDir(config.saveDir)
  await helpers.saveData(filteredData, config.saveDir)
}

const siftTrash = async (config) => {
  data = await helpers.collect(config.dataDir)
  const filteredData = applyFilters(config.filters)
  console.log(`Filtered data. Old size: ${data.length}, new size ${filteredData.length}`)
  const polarityData = await jsonFile.readFile(polarityFile);
  helpers.attachPolarity(filteredData, polarityData)
  return filteredData;
}

const setup = async (config) => {
  const filteredData = await siftTrash(config)
  saveGold(filteredData, config.saveDir)
  return true;
}





const config = {
  dataDir : './data/json/miniSample',
  saveDir : './data/gold',
  filters : [ filters.filterDate(5), filters.filterSize(500), filters.hasTitle, filters.hasImageUrl ]
}
setup(config).then( status => console.log("Setup complete!"") )
.catch( e => console.error("Error during setup", e) )
