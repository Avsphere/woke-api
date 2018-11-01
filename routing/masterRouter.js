const express = require('express');
const router = express.Router();
const path = require('path')
const jsonFile = require('jsonFile')
const fs = require('fs')
const consumptionFolder = './data/vaneerConsumption/';

const getFileNames = () => {
  return new Promise( (resolve, reject) => {
    fs.readdir(consumptionFolder, (err, files) => {
      if ( err) { reject(err) }
      resolve( files.map( f => path.join(consumptionFolder, f) ) )
    })
  })
}

const getFile = (f) => jsonFile.readFile(f)

router.get('/', async (req, res) => {
  let fileNames = await getFileNames();
  res.render('index', { fileNames : fileNames })
})


router.post('/getFile', async (req, res) => {
  if ( !req.body.filePath.includes('vaneerConsumption') ) { res.send({rude : true}) }
  let fileData = await getFile(req.body.filePath);
  res.send(fileData)
})


module.exports = router;
