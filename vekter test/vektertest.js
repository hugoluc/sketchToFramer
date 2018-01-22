'use strict';
const fs = require('fs')
var obj = JSON.parse(fs.readFileSync('/Users/hugolucena/Desktop/vekter test/design.json', 'utf8'));
var id = "000000"
var alphabetArray = 'abcdefghijklmnopqrstuvwxyz'.split('');

var root = obj.root
var artBoardBase = obj.root.children[0]
var rectBase = root.children[0].children[0]
var frameBase = root.children[0].children[1]

function addframeBase(_properties){

  var layer = Object.assign({}, frameBase);
  layer.id = getUniqueId()
  Object.assign(layer, _properties)
  artBoardBase.children.push(layer)

}

function getUniqueId(){

  var _string = id
  var alphabetArray = 'abcdefghijklmnopqrstuvwxyz'.split('');

  function increment(_pos){

    if(_string[_pos] == "z"){
      //recursevly change next number

      _string = _string.substring(0, _pos) + 0 + _string.substring(_pos + 1);
      _pos--
      increment(_pos)

    }else{

      if(isNaN(parseInt(_string[_pos]))){
        // increment letters

        newLetter = alphabetArray[ alphabetArray.indexOf(_string[_pos]) + 1 ]
        _string = _string.substring(0, _pos) + newLetter + _string.substring(_pos + 1);

      }else{
        //increment Numbers
        if(_string[_pos] == 9){
          _string = _string.substring(0, _pos) + "a" + _string.substring(_pos + 1);
        }else{
          var newNum = parseInt(_string[_pos]) + 1
          _string = _string.substring(0, _pos) + newNum + _string.substring(_pos + 1);

        }
      }
    }
  }

  increment(_string.length-1)
  id = _string
  return _string
}

addframeBase(
  {
    "width" : 400,
    "color" : "red"
  }
)

addframeBase(
  {
    "x" : 100,
    "y" : 100,
    "width" : 100,
    "height" : 200,
    "color" : "red"
  }
)

obj = JSON.stringify(obj, null, "\t")
fs.writeFile('/Users/hugolucena/Desktop/vekter test/design.vekter', obj, function(err){
  if(err){
    console.log(false);
  } else {
    console.log(true);
  }
});

console.log(artBoardBase.children.length)
