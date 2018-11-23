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
  estimatedBias : { type : Number, default : 2 }
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
  const usersEstimatedBias = this.estimatedBias;
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
  let variationPolarity = mapPolarity( getArticlesPolarity() >= 2 ? getArticlesPolarity() - 1 : getArticlesPolarity() + 1 )
  const matchingCount = Math.floor( matchingProportion*collectionSize)
  const notMatchingCount = Math.ceil( (1-matchingProportion)*collectionSize )
  let matchingArticles = []
  let variationArticles = []
  if ( articlesPolarity == 'center') {
    const leftCenter = await Article.find({ 'polarityScore.allSidesBias' : 'left-center', 'topic' : topic }).limit( Math.ceil(collectionSize/2) ).exec()
    const rightCenter = await Article.find({ 'polarityScore.allSidesBias' : 'right-center', 'topic' : topic }).limit( Math.ceil(collectionSize/2) ).exec()
    variationArticles = leftCenter.concat(rightCenter)
  } else {
    matchingArticles = await Article.find({ 'polarityScore.allSidesBias' : articlesPolarity, 'topic' : topic }).limit(matchingCount).exec()
    variationArticles = await Article.find({ 'polarityScore.allSidesBias' : variationPolarity, 'topic' : topic }).limit(notMatchingCount).exec()
  }
  return matchingArticles.concat(variationArticles)
}



module.exports = mongoose.model('User', userSchema);
