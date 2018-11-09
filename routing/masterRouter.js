const express = require('express');
const router = express.Router();
const path = require('path')
const jsonFile = require('jsonfile')
const fs = require('fs')
const helpers = require('../logic/helpers');
const consumptionFolder = './data/filteredJson/';
const moment = require('moment')
const Article = require('../db/article');


router.get('/', async (req, res) => {
  res.render('index', { fileNames : []})
})


router.post('/getCollection', async (req, res) => {
  let collectionSize = req.body.collectionSize || 1;
  let query = {}
  if ( req.body.topic ) {
    query['topicScores.topic'] = req.body.topic;
  }
  if ( req.body.polarity ) {
    query['polarityScore.allSidesBias'] = req.body.polarity
  }
  if ( req.body.title ) {
    //reset query obj bc of specificity
    query = {}
    query['title'] = req.body.title
  }
  let articles = await Article.find(query).limit(collectionSize).exec()
  articles.sort( (a,b) => moment(b.date_publish) - moment(a.date_publish) )
  res.send(articles)
})

router.post('/getArticle', async (req, res) => {
  await Article.find({'topicScores.topic' : req.body.topic}).limit(10).exec()
  res.send(fileData)
})


module.exports = router;
