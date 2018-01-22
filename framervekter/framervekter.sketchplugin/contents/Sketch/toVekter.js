var layerNames = {};
var framerLayers = [];
var originalVekter = {};
var alphabetArray = 'abcdefghijklmnopqrstuvwxyz'.split('');
var globalId = "000000";
var originalVekter,newRoot;
var framerModels = {};

////////////////////////////////////////////////////////////////////////////////

function onRun(context) {

  // get sketch ontext
  var sketch = context.api();

  //get selectedDocument and selection contexts
  var document = sketch.selectedDocument;
  var selection = document.selectedLayers;

  //return error if nothing is selected
  if (selection.isEmpty) {
    sketch.message("Error! No layer selected!");
    return false;
  }

  //call file selector and get export url
  var url = getExportUrl()
  if(url == false){
    sketch.message("Error! Select a folder to exporter your file");
    return false;
  }

  // get original vekter object
	var vekterUrl = sketch.resourceNamed('design.json')
  var vekterStr = [[NSString alloc] initWithContentsOfURL:vekterUrl];
  originalVekter = JSON.parse(vekterStr)

  //create new root with no children
  newRoot = Object.assign({}, originalVekter.root)
  newRoot = Object.assign(newRoot,{
    "children" : [],
    "id" : getUniqueId()
  })

  //Generate framer object models
  framerModels.artboard = Object.assign({}, originalVekter.root.children[0])
  framerModels.artboard = Object.assign(framerModels.artboard, {
    "children" : [],
    "id" : "ART"
  })
  framerModels.frame = Object.assign({}, originalVekter.root.children[0].children[0])
  framerModels.frame = Object.assign(framerModels.frame,{
    "children" : [],
    "id" : "FRAM"
  })

  framerModels.rectangle = Object.assign({}, originalVekter.root.children[0].children[1])
  framerModels.rectangle = Object.assign(framerModels.rectangle, {
    "children" : [],
    "id" : "RECT"
  })

  //add sketch layers to root
  selection.iterate(function (layer) {
    addFramerLayer(layer,newRoot);
  });

  //generate final vekter obj
  exportVekter(newRoot,url)

}

function addFramerLayer(_layer, _parent) {

  //check is layers are visible and are not sliced
  if (_layer.sketchObject.isVisible() && _layer.sketchObject.class() != MSSliceLayer) {

    var properties = getProperties(_layer,_parent))
    console.log(properties.name)
    console.log(properties)

    if(_layer.isGroup) {

      if(_layer.isArtboard) {
        createCanvas(_layer,_parent,properties)
      }else{
        //createFrame
        createFrame(_layer,_parent,properties)
      }

      _layer.iterate(function(_children){
        addFramerLayer(_children, _parent.children[_parent.children.length-1])
      })

    }else if(_layer.isShape){

      createRectangle(_layer,_parent,properties)

    }

    return

    //
    // ///////////////////////////////////////////////  TEXT
    // } else if (layer.isText) {
    //   framerObject.layerType = "TextLayer";
    //   Object.assign(framerObject, textLayerCode(sketchObject));
    //   framerLayers.push(framerObject);
    //
    // } else {
    //   Object.assign(framerObject, layerCode(sketchObject));
    //   framerLayers.push(framerObject);
    // }

  }
};

function getUniqueId(){

  var _string = globalId
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
  globalId = _string
  return _string
}

////////////////////////////////////////////////////////////////////////////////

function textLayerCode(layer) {

  var framerObject = {};

  // if text is fixed width
  if (layer.textBehaviour() == 1) {
    framerObject.width = layer.frame().width() * scale;
  }

  framerObject.text = '"' + layer.stringValue() + '"';
  framerObject.fontSize = layer.fontSize() * scale;
  framerObject.fontFamily = '"' + layer.font().familyName() + '"';

  var fontStyle = getFontStyle(layer);
  if (fontStyle.slope != "") {
    framerObject.fontStyle = fontStyle.slope;
  }

  if (fontStyle.weight != "") {
    framerObject.fontWeight = fontStyle.weight;
  }

  if (layer.characterSpacing() != null) {
    framerObject.letterSpacing = (layer.characterSpacing() * scale).toFixed(1);
  }

  if (layer.lineHeight() != 0) {
    framerObject.lineHeight = layer.lineHeight() * scale / framerObject.fontSize;
  }

  switch (layer.textAlignment()) {
    case 1:
      framerObject.textAlign = '"right"';
      break;
    case 2:
      framerObject.textAlign = '"center"';
      break;
    default:
      framerObject.textAlign = '"left"';
  }

  if (layer.styleAttributes().NSStrikethrough == 1) {
    framerObject.textDecoration = '"line-through"';
  }

  if (layer.styleAttributes().NSUnderline == 1) {
    framerObject.textDecoration = '"underline"';
  }

  if (layer.styleAttributes().MSAttributedStringTextTransformAttribute == 1) {
    framerObject.textTransform = '"uppercase"';
  }

  if (layer.styleAttributes().MSAttributedStringTextTransformAttribute == 2) {
    framerObject.textTransform = '"lowercase"';
  }

  framerObject.color = rgbaCode(layer.textColor());

  var shadow = topShadow(layer.style());
  if (shadow != null) {
    framerObject.shadowColor = rgbaCode(shadow.color());
    framerObject.shadowX = shadow.offsetX() * scale;
    framerObject.shadowY = shadow.offsetY() * scale;
    framerObject.shadowBlur = shadow.blurRadius() * scale;
  }

  var opacity = layer.style().contextSettings().opacity();
  if (opacity != 1) {
    framerObject.opacity = opacity;
  }

  return framerObject;
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////   ADD FRAMER OBJ FROM MODELS  /////////////////////////
////////////////////////////////////////////////////////////////////////////////

function createCanvas(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.artboard)
  newObj = Object.assign(newObj, {
    "x" : _layer.sketchObject.absoluteRect().rulerX(),
    "y" : _layer.sketchObject.absoluteRect().rulerY(),
  })
  newObj = Object.assign(newObj,_properties)

  _parent.children.push(newObj)

}

function createRectangle(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.rectangle)

  if(_layer.sketchObject.name() + "" == "Mask"){

    _parent = Object.assign(_parent, {
      "width" : _layer.sketchObject.frame().width(),
      "height" : _layer.sketchObject.frame().height()
    })
    _parent = Object.assign(_parent,getStyle(_layer,_parent,_properties))

  }else{

    newObj = Object.assign(newObj, {
      "x" : _layer.sketchObject.frame().x(),
      "y" : _layer.sketchObject.frame().y(),
      "width" : _layer.sketchObject.frame().width(),
      "height" : _layer.sketchObject.frame().height()
    })
    newObj = Object.assign(newObj,_properties)
    newObj = Object.assign(newObj,getStyle(_layer,_parent,_properties))
    _parent.children.push(newObj)

  }

}

function createFrame(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.frame)
  newObj = Object.assign(newObj, {
    "x" : _layer.sketchObject.frame().x(),
    "y" : _layer.sketchObject.frame().y(),
    "width" : _layer.sketchObject.frame().width(),
    "height" : _layer.sketchObject.frame().height()
  })
  newObj = Object.assign(newObj,_properties)
  newObj = Object.assign(newObj,getStyle(_layer,_parent,_properties))
  _parent.children.push(newObj)

}

////////////////////////////////////////////////////////////////////////////////
//////////////////////////   GET PROPERTIES FROM NAME   ////////////////////////
////////////////////////////////////////////////////////////////////////////////

function getProperties(_obj,_parent){

  var name = _obj.sketchObject.name()
  var frame = _obj.sketchObject.frame()
  var openBraquet = name.indexOf("[")
  var closeBraquet = name.indexOf("]")

  //return false if string has duplicate braquets
  if(name.substring(openBraquet,name.length).indexOf("[") != -1){
    //error Message
    return false

    //return false if string has duplicate braquets
  }else if(name.substring(closeBraquet,name.length).indexOf("]") != -1){
    //error Message
    return false

  // Check if string have an open and a closing braquet
  }else if(openBraquet != -1 && closeBraquet != -1){

    //Check of string is well formed
    if (openBraquet < closeBraquet){

      var properties = {
        "children" : [],
        "id" : getUniqueId(),
        "parentid" : _parent["id"],
        "top" : null,
        "bottom" : null,
        "left" : null,
        "right" : null,
        "widthFactor" : null,
        "heightFactor" : null,
        "clip" : false,
        "name" : _obj.sketchObject.name().substring(0,openBraquet)
      }

      var propertiesStr = name.substring(openBraquet+1,closeBraquet)

      if(propertiesStr.indexOf("M") != -1){ properties.clip = true }

      if(propertiesStr.indexOf("T") != -1){
        //top null
        properties.top = _obj.sketchObject.frame().y() + ""
      }

      if(propertiesStr.indexOf("B") != -1){
        //bottom null
        properties.bottom = _parent.height - _obj.sketchObject.frame().y() -  _obj.sketchObject.frame().height()
      }

      if(propertiesStr.indexOf("L") != -1){
        properties.top = _obj.sketchObject.frame().x() + ""
        //left  null
      }

      if(propertiesStr.indexOf("R") != -1){
        //right  null
      }

      if(propertiesStr.indexOf("W") != -1){
        //width factor null
      }

      if(propertiesStr.indexOf("H") != -1
    ){
        //height factor null
      }
    }

    return properties

  }else{
    //layer with no properties specifyed in the layer name

    var properties = {
      "children" : [],
      "id" : getUniqueId(),
      "parentid" : _parent["id"],
      "top" : null,
      "bottom" : null,
      "left" : null,
      "right" : null,
      "widthFactor" : null,
      "heightFactor" : null,
      "clip" : false,
      "name" : _obj.sketchObject.name() + ""
    }

    return properties
  }

}

function getStyle(_obj,_parent,_properties){

  var properties = {}

  // /////////////////////////////////////////////////
  // ////////////////// FILL ////////////////////////
  // ///////////////////////////////////////////////

  var fills = _obj.sketchObject.style().enabledFills();
  var fill = null;

  if(fills.length > 0){

    var fillType = fills[fills.length-1].fillType();

    if (fillType == 0) {

      fill = fills[fills.length-1];

    }else if(fillType == 1){

      properties.fillGradient = toGradient(_obj.sketchObject.style().enabledFills()[0].gradient().gradientStringWithMasterAlpha(0))
      properties.fillType = "gradient"

    }

  }

  if (fill == null) {
    properties.fillColor = '"transparent"';
  } else {
    properties.fillColor = rgbaCode(fill.color())
  }

  // /////////////////////////////////////////////////
  // ////////////////// BORDER //////////////////////
  // ///////////////////////////////////////////////

  //------------------BORDER RADIUS
  var borderRadius,radiusBottomLeft,radiusBottomRight,radiusTopLeft,radiusTopRight;

  if (isCircle(_obj.sketchObject)) {
    //if object is a circle:

    borderRadius = _obj.sketchObject.frame.width() / 2;
    radiusBottomLeft,radiusBottomRight,radiusTopLeft,radiusTopRight = _obj.sketchObject.frame.width() / 2;

  } else if(_properties.clip) {
    //if object is a mask

    var rectObj = _obj.sketchObject.layers().firstObject().layers().firstObject()
    radiusTopLeft = rectObj.path().points()[0].cornerRadius()
    radiusTopRight = rectObj.path().points()[1].cornerRadius()
    radiusBottomRight = rectObj.path().points()[2].cornerRadius()
    radiusBottomLeft = rectObj.path().points()[3].cornerRadius()

  }else if (isRectangle(_obj.sketchObject)){
    //if object is a shape

    var rectObj = _obj.sketchObject.layers().firstObject()
    radiusTopLeft = rectObj.path().points()[0].cornerRadius()
    radiusTopRight = rectObj.path().points()[1].cornerRadius()
    radiusBottomRight = rectObj.path().points()[2].cornerRadius()
    radiusBottomLeft = rectObj.path().points()[3].cornerRadius()

  }

  if (borderRadius != 0) {

    if(radiusBottomLeft == radiusBottomRight && radiusBottomRight == radiusTopLeft && radiusTopLeft == radiusTopRight){

      properties.radius = radiusBottomLeft;
      properties.radiusPerCorner = false

    }else{

      properties.radius = 0
      properties.radiusTopLeft = radiusTopLeft
      properties.radiusTopRight = radiusTopRight
      properties.radiusBottomRight = radiusBottomRight
      properties.radiusBottomLeft = radiusBottomLeft
      properties.radiusPerCorner = true

    }
  }

  //---------------------BORDER STYLE

  var border = topBorder(_obj.sketchObject.style());
  if (border != null) {
    properties.borderColor = rgbToHex(border.color());
    properties.borderWidth = border.thickness();
    properties.borderEnabled = true;
  }

  // /////////////////////////////////////////////////
  // ////////////////// SHADOWS /////////////////////
  // ///////////////////////////////////////////////
  properties.boxShadows = []

  var shadow = _obj.sketchObject.style().enabledShadows();

  if (shadow != null) {

    for(var i = 0; i < shadow.length; i++ ){

      var s = {
        "__class" : "BoxShadow",
        "blur" : shadow[i].blurRadius(),
        "color" : rgbaCode(shadow[i].color()),
        "enabled" : true,
        "inset" : false,
        "spread" :  shadow[i].spread(),
        "x" : shadow[i].offsetX(),
        "y" : shadow[i].offsetY()
      }

      properties.boxShadows.push(s)

    }

  }

  // /////////////////////////////////////////////////
  // ////////////////// OPACITY /////////////////////
  // ///////////////////////////////////////////////
  var opacity = _obj.sketchObject.style().contextSettings().opacity();
  if (opacity != 1) {
    properties.opacity = opacity;
  }

  return properties

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////   SKETCH STYLING UTILITIES   //////////////////////////
////////////////////////////////////////////////////////////////////////////////

function isRectangle(layer) {
  var layerCount = layer.layers().count();
  var layerClass = layer.layers()[0].class();

  if (layerCount == 1 && layerClass == MSRectangleShape) {
    return true;
  } else {
    return false;
  }
}

function isCircle(layer) {


  var layerCount = layer.layers().count();
  var layerClass = layer.layers()[0].class();
  var width = layer.frame().width();
  var height = layer.frame().height();

  if (layerCount == 1 && layerClass == MSOvalShape && width == height) {
    return true;
  } else {
    return false;
  }
}

function getFontStyle(layer) {

  var fontWeights = {
    "thin": 100,
    "extralight": 200,
    "ultralight": 200,
    "light": 300,
    "book": 400,
    "normal": 400,
    "regular": 400,
    "roman": 400,
    "medium": 500,
    "semibold": 600,
    "demibold": 600,
    "bold": 700,
    "boldmt": 700,
    "psboldmt": 700,
    "extrabold": 800,
    "ultrabold": 800,
    "black": 900,
    "heavy": 900
  };

  var fontFamily = layer.font().familyName().replace(/ /g, "");
  var fontName = layer.fontPostscriptName().replace(/-/g, "");
  var val = fontName.replace(fontFamily, "").toLowerCase();

  var fontWeight = "", fontSlope = "";

  if (val.includes("italic")) {
    fontSlope = '"italic"';
    val = val.replace("italic", "");
  }

  if (val.includes("oblique")) {
    fontSlope = '"oblique"';
    val = val.replace("oblique", "");
  }

  if (fontWeights[val] != undefined) {
    fontWeight = fontWeights[val];
  }

  return {weight: fontWeight, slope: fontSlope};

}

//////////////////////////////////////////////////////////

function rgbaCode(colour) {
  var red = Math.round(colour.red() * 255);
  var green = Math.round(colour.green() * 255);
  var blue = Math.round(colour.blue() * 255);

  return 'rgba(' + red + ',' + green + ',' + blue + ',' + colour.alpha() + ')';
}

function rgbToHex(colour){

  var red = Math.round(colour.red() * 255);
  var green = Math.round(colour.green() * 255);
  var blue = Math.round(colour.blue() * 255);

  return "#" + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);

}

function toGradient(_gradient){

  var gradientData = _gradient.split(",")

  return {
    "__class" : "LinearGradient",
    "alpha" : 1,
    "angle" :  Math.abs(parseInt(gradientData[0].slice(0,-3))),

    //FIXME: Make HEX code in to HSLA format to allow shifting gradient color inside spectrum
    //FIXME: CHeck versioning to proer generate properties name (start vs firstcolor)
    "firstColor" :  gradientData[1].trim().split(" ")[0],
    "start" :  gradientData[1].trim().split(" ")[0],
    "lastColor" :  gradientData[gradientData.length-1].trim().split(" ")[0],
    "end" :  gradientData[gradientData.length-1].trim().split(" ")[0],
  }


}

function topFill(style) {

  var fills = style.enabledFills();
  var i, len, fill = null;

  for (i = 0, len = fills.length; i < len; i++) {
    var fillType = fills[i].fillType();
    if (fillType == 0) {
      fill = fills[i];
    }else if(1){
      fill = _obj.sketchObject.style().enabledFills()[0].gradient().gradientStringWithMasterAlpha(0)
    }
  }

  return fill;

}

function topBorder(style) {
  var borders = style.enabledBorders();

  var i, len, border = null;
  for (i = 0, len = borders.length; i < len; i++) {
    var fillType = borders[i].fillType();
    if (fillType == 0) {
      border = borders[i];
    }
  }

  return border;
}

function topShadow(style) {
  var shadows = style.enabledShadows();
  var len = shadows.length;

  if (len == 0) {
    return null;
  } else {
    return shadows[len - 1];
  }
}

////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////   EXPORTING FILE  ////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function exportVekter(_root,_url){

  var newVekter = { "root" : _root }
  var newVekerTxt = JSON.stringify(newVekter, null, "\t")

  //export
  var exportPath = _url.path() + "/design.vekter"
  var path = [@"" stringByAppendingString:exportPath];
  var str = [@"" stringByAppendingString:newVekerTxt];
  str.dataUsingEncoding_(NSUTF8StringEncoding).writeToFile_atomically_(path, true);

}

function getExportUrl() {

	  // Panel
    var openPanel = [NSOpenPanel openPanel]

    [openPanel setTitle: "Choose a location…"];
    [openPanel setMessage: "Select the export location…"];
    [openPanel setPrompt: "Export"];

    [openPanel setCanCreateDirectories: true]
    [openPanel setCanChooseFiles: false]
    [openPanel setCanChooseDirectories: true]
    [openPanel setAllowsMultipleSelection: false]
    [openPanel setShowsHiddenFiles: false]
    [openPanel setExtensionHidden: false]

    var openPanelButtonPressed = [openPanel runModal]

    if (openPanelButtonPressed == NSFileHandlingPanelOKButton) {
      return [openPanel URL]
    } else {

      return false
		}

}
