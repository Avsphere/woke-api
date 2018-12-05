import $ from 'jquery';
import axios from 'axios'

const game = {}


const build_next = (articles, user) => {
  let currArticle = 0
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
  }
  const buildCard = () => {
    const buildCardHtml = (article) => {
      return `<div class="card" data-articleId=${article._id}>
        <img class="card-img-top" src="${article.image_url}" onerror="this.src='/media/woke_logo.png'" max-height: 800px; style="width:100%; display: block; ">
        <div class="card-body">
          <h5 class="card-title">${article.title}</h5>
          <p class="card-text">Date Published: ${new Date(article.date_publish).toDateString()} </p>
          <p class="card-text">Source : No way... </p>
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
    currArticle++;
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
      if ( articles[currArticle].polarity.includes('left') ) {
        updateScore('correct')
      } else {
        updateScore('incorrect')
      }
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
      if ( articles[currArticle].polarity.includes('right') ) {
        updateScore('correct')
      } else {
        updateScore('incorrect')
      }
      nextFn()
    })
  }

  const nextFn = () => {
    const $card = buildCard()
    setHandlers($card)
  }
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
//https://mediadc.brightspotcdn.com/dims4/default/488c005/2147483647/strip/true/crop/1200x630+0+0/resize/1200x630!/quality/90/?url=https%3A%2F%2Fmediadc.brightspotcdn.com%2Fd7%2F10%2F221ad6ff40c98fbaa81b2c33bf58%2Fwex-logo-1200x630-08-18.png
//https://media.arkansasonline.com/static/ao_redesign/graphics/adgog.jpg
module.exports = game;
