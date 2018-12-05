const mongoose = require('mongoose');
const Article = require('./article')
const ObjectId = mongoose.Schema.Types.ObjectId;
const { mapPolarity } = require('../logic/helpers')
const userSchema = mongoose.Schema({
  uuid: { type: String, required : true, unique : true},
  articles : [{
    type: ObjectId,
    ref : 'Article'
  }],
  guesses : [{
    biasGuess :  { type: String },
    articleId : { type : ObjectId, ref : 'Article' },
    guessTime : { type : Date, default : Date.now() }
  }],
  estimatedBias : { type : Number, default : 2 },
  age : { type : String },
  score : { type : Number }
})


//track pull couunt in future?
// articleSchema.pre('find', function(next)
// {
//     this.requestCount++;
//     next();
// });


userSchema.methods.getArticles = async function(options) {
  const topic = options.topic;
  const collectionSize = options.collectionSize || 50;
  let matchingProportion= options.matchingProportion || .7; //if the chosen article polarity == 1 then 70% of the articles will be a 1 and 30% a 0
  let usersEstimatedBias = this.estimatedBias;
  const getArticlesPolarity = () => {
    let articlesPolarity = 0
    if ( usersEstimatedBias <= 1 ) {
      articlesPolarity = 1;
    } else if ( usersEstimatedBias > 1 && usersEstimatedBias < 2 ) {
      articlesPolarity = 2;
    } else if ( usersEstimatedBias > 2 && usersEstimatedBias <= 3 ) {
      articlesPolarity = 2;
    } else if ( usersEstimatedBias > 3 && usersEstimatedBias <= 4 ) {
      articlesPolarity = 3;
    } else if ( usersEstimatedBias == 2 ) {
      articlesPolarity = 2
      matchingProportion = .5 //give the user left-center and right-center
    }
    return articlesPolarity
  }
  const articlesPolarity = mapPolarity( getArticlesPolarity() );
  let variationPolarity = 0
  if ( usersEstimatedBias < 2 ) {
    variationPolarity = mapPolarity(3)
  } else if ( usersEstimatedBias > 2 ) {
    variationPolarity = mapPolarity(1)
  }
  const matchingCount = Math.floor( matchingProportion*collectionSize)
  const notMatchingCount = Math.ceil( (1-matchingProportion)*collectionSize )
  console.log(usersEstimatedBias, articlesPolarity, variationPolarity, matchingCount, notMatchingCount)
  let matchingArticles = []
  let variationArticles = []
  if ( usersEstimatedBias == 2) {
    const leftCenter = await Article.find({ 'polarityScore.allSidesBias' : 'left-center', 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.floor(collectionSize/3) ).exec()
    const rightCenter = await Article.find({ 'polarityScore.allSidesBias' : 'right-center', 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.floor(collectionSize/3) ).exec()
    const right = await Article.find({ 'polarityScore.allSidesBias' : 'right', 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.ceil(collectionSize/6) ).exec()
    const left = await Article.find({ 'polarityScore.allSidesBias' : 'left', 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.ceil(collectionSize/6) ).exec()
    variationArticles = leftCenter.concat(rightCenter).concat(right).concat(left)
  } else {
    matchingArticles = await Article.find({ 'polarityScore.allSidesBias' : articlesPolarity, 'topic' : topic, _id : { $nin : this.articles } }).limit( matchingCount ).exec()
    variationArticles = await Article.find({ 'polarityScore.allSidesBias' : variationPolarity, 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.floor(notMatchingCount * .8) ).exec()
    const right = await Article.find({ 'polarityScore.allSidesBias' : 'right', 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.ceil(notMatchingCount * .1) + 1 ).exec() //always give some farther articles
    const left = await Article.find({ 'polarityScore.allSidesBias' : 'left', 'topic' : topic, _id : { $nin : this.articles } }).limit( Math.ceil(notMatchingCount * .1) + 1 ).exec()
    variationArticles = variationArticles.concat(right).concat(left)
  }
  return matchingArticles.concat(variationArticles)
}



module.exports = mongoose.model('User', userSchema);
