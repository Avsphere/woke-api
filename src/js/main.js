import $ from 'jquery';
import axios from 'axios'
import '../css/style.css';
import game from './game.js'


function downloadObjectAsJson(exportObj, exportName) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

$('a').on('click', function(eve) {
  eve.preventDefault()
  console.log(  )
  const filePath = $(this).attr('data-filename');
  axios.post('./getFile', { filePath : filePath} )
  .then( res => {
    console.log(res.data)
    let dlTitle = filePath.split('')
    downloadObjectAsJson(res.data, res.data.filename);
  })
  .catch( e => console.error(e) )
})



if ( window.location.pathname.includes('game')  ) {
  game.start()
}
