const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
const articleSchema = mongoose.Schema({
  requestCount: { type: Number, default: 0, required : true },
  authors : [String],
  date_download : { type : Date, required : false },
  date_modify : { type : Date, required : false },
  date_publish : { type : Date, required : false },
  description : { type : String, required : false },
  filename : { type : String, required : false },
  image_url : { type : String, required : false },
  language : { type : String, required : false },
  localpath : { type : String, required : false },
  title : { type : String, required : false },
  title_page : { type : String, required : false },
  title_rss : { type : String, required : false },
  source_domain : { type : String, required : false },
  text : { type : String, required : false },
  url : { type : String, required : false },
  polarityScore : {
    sourceTitle : { type : String, required : false },
    allSidesBias : { type : String, required : false },
    communityAgree : { type : String, required : false },
    communityDisagree : { type : String, required : false },
    sourceUrl : { type : String, required : false }
  },
  score : {},
  topicScores : {},
  topic : { type : String, required : false }

})


//track pull couunt in future?
// articleSchema.pre('find', function(next)
// {
//     this.requestCount++;
//     next();
// });




module.exports = mongoose.model('Article', articleSchema);
