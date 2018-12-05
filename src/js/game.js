import $ from 'jquery';
import axios from 'axios'

const game = {}


const build_next = (articles, user) => {
  let currArticle = 0
  if ( !user.score ) { user.score = 0}
  const updateScore = (grade) => {
    const updateView = () => {
      $('#score').text(`Current Score : ${user.score}`)
    }
    if ( grade === 'correct') {
       user.score += 100
     }
    else {
      user.score -= 100
    }
    updateView();
  }
  const buildCard = () => {
    const badImageUrls = [
      'https://www.washingtonpost.com/resizer/2CjPNwqvXHPS_2RpuRTKY-p3eVo=/1484x0/www.washingtonpost.com/pb/resources/img/twp-social-share.png',
      'https://mediadc.brightspotcdn.com/dims4/default/488c005/2147483647/strip/true/crop/1200x630+0+0/resize/1200x630!/quality/90/?url=https%3A%2F%2Fmediadc.brightspotcdn.com%2Fd7%2F10%2F221ad6ff40c98fbaa81b2c33bf58%2Fwex-logo-1200x630-08-18.png',
      'https://media.arkansasonline.com/static/ao_redesign/graphics/adgog.jpg',
      'https://www.americanthinker.com/assets/images/at-painter-og-image.png',
      'https://mediadc.brightspotcdn.com/dims4/default/821da43/2147483647/strip/true/crop/800x420+0+90/resize/1200x630!/quality/90/?url=https%3A%2F%2Fmediadc.brightspotcdn.com%2F5c%2Feb%2F9e2a89f73c5f80e751a07ee6460a%2F8772f283e1f4ecbc32fda08c0c397bac.jpg',
    ]
    const buildCardHtml = (article) => {
      let articleImage = article.image_url;
      if ( badImageUrls.includes(articleImage) ) {
        articleImage = '/media/woke_logo.png';
      }
      return `<div class="card" data-articleId=${article._id}>
        <img class="card-img-top" src="${articleImage}" onerror="this.src='/media/woke_logo.png'" style="width:100%; display: block; ">
        <div class="card-body">
          <h5 class="card-title">${article.title}</h5>
          <p class="card-text">${article.text}...</p>
          </div>
        <div class="button-body">
          <div class = "row" >
          <div class = "col">
            <div class = "button btn btn-primary btn-lg btn-block" id="left" type = "button" > Such Left</div>
            </div>
             <div class="col">
              <div class = "button btn btn-danger btn-lg btn-block" id="right" type = "button" > Much Right </div>
              </div>
              </div>
        </div>
        </div>`
    }
    const $card = $( buildCardHtml(articles[currArticle]) )
    $('.card-container').empty()
    $('.card-container').append($card)
    return $card;
  }
  const setHandlers = ($card) => {
    $card.find('#left').on('click', async () => {
      const { data } = axios.post('/game/guess', {
          uuid : user.uuid,
          guess : {
            biasGuess : 'left',
            articleId : articles[currArticle]._id
          }
        })
      console.log(articles[currArticle])
      if ( articles[currArticle].polarity.includes('left') ) {
        updateScore('correct')
      } else {
        updateScore('incorrect')
      }
      currArticle++;
      nextFn()
    })
    $card.find('#right').on('click', async () => {
      const { data } = axios.post('/game/guess', {
          uuid : user.uuid,
          guess : {
            biasGuess : 'right',
            articleId : articles[currArticle]._id
          }
        })
        console.log(articles[currArticle])
      if ( articles[currArticle].polarity.includes('right') ) {
        updateScore('correct')
      } else {
        updateScore('incorrect')
      }
      currArticle++;
      nextFn()
    })

  }

  const nextFn = () => {
    const $card = buildCard()
    setHandlers($card)
  }
  $('#goodArticle').on('click', () => {
    console.log("Good", articles[currArticle])
    const { data } = axios.post('/game/goodArticle', { articleId : articles[currArticle]._id })
    currArticle++;
    nextFn()
  })
  return nextFn;
}


game.start = async() => {
  const { data } = await axios.post('/game/getArticles')
  console.log(data)
  const { articles, user } = data;
  const next = build_next(articles, user)
  const oldOrYoung = () => {
    $('#young').on('click', async () => {
      user.userStatus = await axios.post('/game/userAge', { age : 'young', userId : user._id})
      $('#ageRow').remove()
      next()
    })
    $('#old').on('click', async () => {
      user.userStatus = await axios.post('/game/userAge', { age : 'old', userId : user._id})
      $('#ageRow').remove()
      next()
    })
  }
  oldOrYoung()




}
//https://www.washingtonpost.com/resizer/2CjPNwqvXHPS_2RpuRTKY-p3eVo=/1484x0/www.washingtonpost.com/pb/resources/img/twp-social-share.png'
//https://mediadc.brightspotcdn.com/dims4/default/488c005/2147483647/strip/true/crop/1200x630+0+0/resize/1200x630!/quality/90/?url=https%3A%2F%2Fmediadc.brightspotcdn.com%2Fd7%2F10%2F221ad6ff40c98fbaa81b2c33bf58%2Fwex-logo-1200x630-08-18.png
//https://media.arkansasonline.com/static/ao_redesign/graphics/adgog.jpg
module.exports = game;
