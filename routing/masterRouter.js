const express = require('express');
const router = express.Router();
const path = require('path')
const jsonFile = require('jsonfile')
const fs = require('fs')
const helpers = require('../logic/helpers');
const consumptionFolder = './data/filteredJson/';


router.get('/', async (req, res) => {
  let fileNames = await helpers.fileNames(consumptionFolder).map( f => ('/'))
  res.render('index', { fileNames : fileNames })
})


router.post('/getFile', async (req, res) => {
  let fileData = await getFile(path.join(consumptionFolder,filename) );
  res.send(fileData)
})


module.exports = router;
