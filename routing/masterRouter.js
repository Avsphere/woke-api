const express = require('express');
const router = express.Router();
const path = require('path')
const jsonFile = require('jsonfile')
const fs = require('fs')
const helpers = require('../logic/helpers');
const consumptionFolder = './data/filteredJson/';
const moment = require('moment')
const Article = require('../db/article');
const User = require('../db/user');
const shortid = require('shortid')

const createNewUser = async (uuid) => {
  try {
    let u = new User({ uuid : uuid  })
    const savedUser = await u.save()
    return savedUser;
  } catch (e) {
    console.error("error in createNewUser", e)
    return false
  }
}

const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

router.get('/', async (req, res) => {
  res.render('index', { fileNames : []})
})
router.get('/game', async (req, res) => {
  res.render('game')
})


router.post('/getCollection', async (req, res) => {
  if ( req.body.collectionSize > 200 ) { req.body.collectionSize = 200; }

  const buildQuery = () => {
    let query = {}
    if ( req.body.topic ) {
      query['topic'] = req.body.topic;
    }
    if ( req.body.polarity ) {
      let polarity = req.body.polarity
      if ( typeof polarity == 'number' || polarity.length == 1 ) {
        polarity = helpers.mapPolarity(polarity)
      }
      query['polarityScore.allSidesBias'] = polarity
    }
    if ( req.body.title ) {
      query = {}
      query['title'] = req.body.title
    }
    return query
  }
  let collectionSize = req.body.collectionSize || 1;
  const query = buildQuery();
  let articles = await Article.find(query).limit(collectionSize).exec()
  articles.sort( (a,b) => moment(b.weightedScore) - moment(a.weightedScore) )
  res.send(articles)
})

router.post('/getUserArticles', async (req, res) => {
  try {
    let uuid = req.body.uuid;
    let sortBy = req.body.sortBy || 'topicScore';
    const topic = req.body.topic || 'trump';
    const collectionSize = req.body.collectionSize || 50;
    const matchingProportion = req.body.matchingProportion || .7
    let requestingUser = await User.findOne({ uuid : uuid }).exec()
    if ( !requestingUser ) {
      requestingUser = await createNewUser(uuid);
    }
    let articles = await requestingUser.getArticles({topic : req.body.topic, collectionSize : collectionSize, topic : topic, matchingProportion : matchingProportion });
    if ( sortBy == 'score' ) { articles.sort( (a,b) => b.score.weightedScore - a.score.weightedScore ) }
    if ( sortBy == 'topicScore' ) { articles.sort( (a,b) => b.topicScores[topic] - a.topicScores[topic] ) }
    if ( req.body.shuffle ) {
      articles = shuffle(articles)
    }

    res.send({ articles : articles, user : requestingUser })
  }
  catch ( e ) {
    console.error(e)
    res.status(400)
    res.send({errror : 'create new user incorrect params or duplicate id'})
  }

})

//This can be bypassed with a direct call to getUserArticles
router.post('/createUser', async (req, res) => {
  try {
    let uuid = req.body.uuid;
    let estimatedBias = req.body.estimatedBias || 2;
    const newUser = await createNewUser(uuid);
    res.send(newUser)
  } catch ( e ) {
    console.error(e)
    res.status(400)
    res.send({errror : 'create new user incorrect params or duplicate id'})
  }
})

router.post('/loveArticle', async( req, res) => {
  try {
    if ( !req.body.uuid || !req.body.articleId) { throw new Error('need user uuid and articleId') }
    const lovedArticle = await Article.findById(req.body.articleId).exec()
    let lovingUser = await User.findOne({ uuid : req.body.uuid }).exec()

    if ( !lovedArticle || !lovingUser ) { throw new Error('could not find user or article') }

    if ( !lovingUser.articles.find( ({_id}) => lovedArticle._id.toString() == _id.toString() ) ) {
      lovingUser.articles.push(lovedArticle._id);
      lovingUser = await lovingUser.save()
    }

    const usersPolarities = await Article.find({ _id : { $in : lovingUser.articles } }).select('polarityScore.allSidesBias')
    const estimatedBias = usersPolarities
    .map( polarityScoreDoc => polarityScoreDoc.toObject() )
    .map( ({polarityScore}) => helpers.mapPolarity(polarityScore.allSidesBias) )
    .reduce( (a, b) => a + b) / lovingUser.articles.length;
    lovingUser.estimatedBias = estimatedBias;
    lovingUser = await lovingUser.save();

    res.send(lovingUser);
  } catch ( e ) {
    console.error("Error in loving article", req.body, e)
    res.status = 400
    res.send({ error : 'something went wrong during user loving article, check body params', reqBody : req.body})
  }

})
router.post('/hateArticle', async( req, res) => {
  try {
    if ( !req.body.uuid || !req.body.articleId) { throw new Error('need user uuid and articleId') }
    const hateArticle = await Article.findById(req.body.articleId).exec()
    let hatingUser = await User.findOne({ uuid : req.body.uuid }).exec()

    if ( !hateArticle || !hatingUser ) { throw new Error('could not find user or article') }

    if ( hatingUser.articles.indexOf(hateArticle._id) !== -1 ) {
      const indexOfOffendingArticle = hatingUser.articles.indexOf(hateArticle._id)
      hatingUser.articles.splice(indexOfOffendingArticle, 1);
      hatingUser = await hatingUser.save()
    }

    const usersPolarities = await Article.find({ _id : { $in : hatingUser.articles } }).select('polarityScore.allSidesBias')
    if ( usersPolarities.length != 0 ) {
      const estimatedBias = usersPolarities
      .map( polarityScoreDoc => polarityScoreDoc.toObject() )
      .map( ({polarityScore}) => helpers.mapPolarity(polarityScore.allSidesBias) )
      .reduce( (a, b) => a + b) / hatingUser.articles.length;
      hatingUser.estimatedBias = estimatedBias;
      hatingUser = await hatingUser.save();
    } else {
      hatingUser.estimatedBias = 2;
      hatingUser = await hatingUser.save()
    }
    res.send(hatingUser);
  } catch ( e ) {
    console.error("Error in hating article", req.body, e)
    res.status = 400
    res.send({ error : 'something went wrong during user hating article, check body params', reqBody : req.body})
  }

})

//Results from logic/topicAnalysis.js
router.get('/getTopics', (req, res) => {
  res.send({
    trump : 6342,
    world : 6283,
    technology : 1840,
    domestic : 3185,
    entertainment : 4537
  })
})

router.post('/getArticle', async (req, res) => {
  try {
    let article = {}
    if ( req.body.articleId ) {
      article = await Article.findById(req.body.articleId)
    } else if ( req.body.articleLocalPath ) {
      article = await Article.findOne({ localpath : req.body.articleLocalpath })
    }
    res.send(article)
  } catch ( e ) {
    res.status(400)
    res.send({error : 'something went wrong, check params', params : req.body})
  }
})

router.post('/getUser', async (req, res) => {
  try {
    const user = await User.findOne({ uuid : req.body.uuid })
    res.send(user);
  } catch ( e ) {
    res.status(400)
    res.send({error : 'something went wrong, check params', params : req.body})
  }
})

router.post('/game/goodArticle', async(req, res) => {
  try {
    const article = await Article.findOne({ _id : req.body.articleId}).exec()
    article.goodGameArticle = false;
    article.save()
    res.send({success : true})
  } catch ( e ) {
    console.log(e)
    res.status(400)
    res.send({error : 'something went wrong, check params', params : req.body})
  }
})

router.post('/game/getArticles', async(req, res) => {
  const mehTopics = ['technology', 'entertainment' ]
  const mehSources = ["theblaze.com"]
  const newUser = await createNewUser( shortid.generate() );
  const truncate = (articles) => articles.map( a => { return {
    _id : a._id,
    source_domain : a.source_domain,
    title : a.title,
    text : a.text.substring(0,50),
    polarity : a.polarityScore.allSidesBias,
    topic : a.topic,
    date_publish : a.date_publish,
    url : a.url,
    image_url : a.image_url
  }})
  const skip = 100;
  const articles = await Article.find({
    source_domain : { $nin : mehSources },
    'polarityScore.allSidesBias' : { $in : ['right', 'right-center', 'left', 'left-center'] } ,
    'topic' : { $nin : mehTopics },
    goodGameArticle : true
   })
  .sort({ 'score.weightedScore' : -1 })
  // .skip(skip)
  .limit(200)
  .exec()
  // const left = await Article.find({
  //   'polarityScore.allSidesBias' : { $in : ['left', 'left-center'] }, 'topic' : { $nin : mehTopics },
  //  })
  // .sort({ 'score.weightedScore' : -1 })
  // // .skip(skip)
  // .limit(50)
  // .exec()

  const allArticles = truncate( shuffle( articles) )
  res.send({ articles : allArticles, user : newUser})
})

router.post('/game/guess', async(req, res) => {
  try {
    const { uuid, guess } = req.body;
    const user = await User.findOne({ uuid : uuid })
    user.guesses.push({
      biasGuess : guess.biasGuess,
      articleId : guess.articleId
    })
    await user.save()
    res.send({success : true})
  } catch ( e ) {
    console.error(e)
    res.status(400)
    res.send({error : 'Hmmm something went wrong... Suspicious..'})
  }
})

router.post('/game/userAge', async(req, res) => {
  try {
    const { age, userId } = req.body;
    const user = await User.findById(userId).exec()
    user.age = age
    await user.save()
    res.send({success : true})
  } catch ( e ) {
    console.error(e)
    res.status(400)
    res.send({error : 'Hmmm something went wrong... Suspicious..'})
  }
})


module.exports = router;
