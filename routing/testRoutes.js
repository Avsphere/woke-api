const express = require('express');
const router = express.Router();
const path = require('path')
const jsonFile = require('jsonfile')
const fs = require('fs')
const helpers = require('../logic/helpers');
const Article = require('../db/article');
const mongoose = require('mongoose');
require('dotenv').config()

mongoose.connect(process.env.DB_CONN, { useNewUrlParser : true }).then(
  () => { console.log("Connected to database!"), testPull() },
  err => { console.log("ERROR - Database connection failed")}
)

const testPull = async () => {
  const articles = await Article.find({'topicScores.topic' : 'trumpTopic'}).limit(10).exec()
  console.log(articles)
}
