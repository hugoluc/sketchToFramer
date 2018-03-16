var layerNames = {};
var framerLayers = [];
var originalVekter = {};
var alphabetArray = 'abcdefghijklmnopqrstuvwxyz'.split('');
var maskFolder = [];
var maskChainEnabled = false
var url;
var allImages = {}
var allLayerNames = {}

var globelIdentifyers = {
  "id" : "00000",
  "key" : "000",
  "name" : "0000"
}

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
  url = getExportUrl()
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
    "id" : globelIdentifyers.id
  })

  //Generate framer object models
  framerModels.artboard = Object.assign({}, originalVekter.root.children[0])
  framerModels.artboard = Object.assign(framerModels.artboard, {
    "children" : [],
    "id" : "ART",
    "clip" :  true
  })

  framerModels.path = Object.assign({}, originalVekter.root.children[0].children[0])
  framerModels.pathSegment = framerModels.path.pathSegments[0]

  framerModels.path = Object.assign(framerModels.path, {
    "pathSegments" : [],
    "id" : "PATH"
  })

  framerModels.frame = Object.assign({}, originalVekter.root.children[0].children[1])
  framerModels.frame = Object.assign(framerModels.frame,{
    "children" : [],
    "id" : "FRAM"
  })

  framerModels.rectangle = Object.assign({}, originalVekter.root.children[0].children[2])
  framerModels.rectangle = Object.assign(framerModels.rectangle, {
    "children" : [],
    "id" : "RECT"
  })


  framerModels.text = Object.assign({}, originalVekter.root.children[0].children[3])
  framerModels.text = Object.assign(framerModels.text, {
    "id" : "TEXT"
  })

  framerModels.combinedPath = Object.assign({}, originalVekter.root.children[0].children[4])
  framerModels.combinedPath = Object.assign(framerModels.combinedPath, {
    "id" : "combinedPath"
  })

  framerModels.image = Object.assign({}, originalVekter.root.children[0].children[5])
  framerModels.image = Object.assign(framerModels.image, {
    "id" : "IMAGE"
  })

  //add sketch layers to root
  selection.iterate(function (layer) {
    addFramerLayer(layer,newRoot);
  });


  //generate final vekter obj
  exportVekter(newRoot,url)

}

function addFramerLayer(_layer, _parent) {

  //check if layers are visible and are not sliced
  if (_layer.sketchObject.isVisible() && _layer.sketchObject.class() != MSSliceLayer) {

    ///////////////////////////////////////////////  MASK

    if(_layer.sketchObject.hasClippingMask() == 1 && !_layer.isArtboard){

      if(maskChainEnabled){
        _parent = maskFolder[maskFolder.length-1]
      }

      maskChainEnabled = true
      var properties = getFrameProperties(_layer,_parent))
      properties.clip = true
      var newMaskFolder = createFrame(_layer,_parent,properties)
      newMaskFolder.name = properties.name + "-MaskGroup"
      maskFolder.push(newMaskFolder)
      _parent = maskFolder[maskFolder.length-1]

    }else if(maskChainEnabled){

      if(_layer.sketchObject.shouldBreakMaskChain() == 1 || maskFolder[maskFolder.length-1].parentid != _parent.id){

        maskChainEnabled = false
        maskFolder.pop()

      }else if(_layer.isGroup){

        maskChainEnabled = false
        _parent = maskFolder[maskFolder.length-1]

      }else{
        _parent = maskFolder[maskFolder.length-1]
      }

    }


    ///////////////////////////////////////////////  FRAME



    if(_layer.isGroup) {

      var properties = getFrameProperties(_layer,_parent))

      if(_layer.isArtboard) {
        var newCanvas = createCanvas(_layer,_parent,properties)
        newCanvas.isCanvas = true
      }else{
        //createFrame
        createFrame(_layer,_parent,properties,true)
      }

      _layer.iterate(function(_children){
        addFramerLayer(_children, _parent.children[_parent.children.length-1])
      })

      if(_layer.isArtboard){
        delete newCanvas["isCanvas"]
      }

    ///////////////////////////////////////////////  SHAPES + PATH
    }else if(_layer.isShape){

      var properties = getShapeProperties(_layer,_parent))

      if(_layer.sketchObject.layers().length > 1 ){

        createComposedPath(_layer,_parent,properties)

      }else if(_layer.sketchObject.layers()[0].class() == MSShapePathLayer){
        createPath(_layer,_parent,properties)

      }else if (_layer.sketchObject.layers()[0].class() == MSRectangleShape){

        var properties = getFrameProperties(_layer,_parent))
        createFrame(_layer,_parent,properties,false)

      }else{
        createPath(_layer,_parent,properties)
      }

    ///////////////////////////////////////////////  TEXT
    }else if(_layer.isText){
      var properties = getShapeProperties(_layer,_parent))
      createText(_layer,_parent,properties)
    }else if(_layer.isImage){
      var properties = getShapeProperties(_layer,_parent))
      createImage(_layer,_parent,properties)
    }

  }
};

function getUniqueIdentifyer(_identifyer){

  var _string = globelIdentifyers[_identifyer]
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
  globelIdentifyers[_identifyer] = _string
  return _string
}

function uniqueLayerName(_name){
  if (allLayerNames[_name] > 0) {
    var count = ++allLayerNames[_name];
    return _name + "_" + count;
  }
  else {
    allLayerNames[_name] = 1;
    return _name;
  }
}

////////////////////////////////////////////////////////////////////////////////
///////////////////   GET PROPERTIES FROM SKETCH LAYERS   //////////////////////
////////////////////////////////////////////////////////////////////////////////

function getShapeProperties(_layer,_parent){

  var properties = {
    "id" : getUniqueIdentifyer("id"),
    "parentid" : _parent["id"],
    "name" : _layer.sketchObject ? _layer.sketchObject.name() + "" : _layer.name() + ""
  }

  properties.name = uniqueLayerName( properties.name.replace(/[^a-zA-Z ]/g, "").replace(/\s/g,"") )

  return properties

}

function getFrameProperties(_layer,_parent){

    var properties = getShapeProperties(_layer,_parent)
    properties = Object.assign(properties, getFixedPosition(_layer,_parent) )
    properties = Object.assign(properties, getFixedSize(_layer,_parent) )

    var name = properties.name
    var frame = _layer.sketchObject.frame()
    var openBraquet = name.indexOf("[")
    var closeBraquet = name.indexOf("]")

    //return false if string has duplicate braquets
    if(openBraquet != -1 && closeBraquet != -1){

      //Check of string is well formed
      if (openBraquet < closeBraquet){

        Object.assign(properties, {
          "children" : [],
          "clip" : false,
        })

        var propertiesStr = name.substring(openBraquet+1,closeBraquet)

        if(propertiesStr.indexOf("M") != -1){ properties.clip = true }

      }

      return properties

    }else{
      //layer with no properties specifyed in the layer name

      Object.assign(properties, {
        "children" : [],
        "clip" : false,
        "targetName" : properties.name
      })

      return properties
    }

}

function getStyle(_layer,_parent,_properties,_isGroup){

  var properties = {}
  var layer = _layer.sketchObject ? _layer.sketchObject : _layer

  // /////////////////////////////////////////////////
  // ////////////////// FILL ////////////////////////
  // ///////////////////////////////////////////////

  var fills = layer.style().enabledFills();

  if(fills.length > 0 && !_isGroup){

    properties.fillEnabled = true;

    var fillType = fills[0].fillType();

    if (fillType == 0) {

      properties.fillColor = rgbaCode(fills[0].color())

    }else if(fillType == 1){
      properties.fillGradient = getGradient(layer.style().enabledFills()[0].gradient().gradientStringWithMasterAlpha(1))
      properties.fillType = "gradient"
    }

  }else{
    properties.fillEnabled = false;
  }


  // /////////////////////////////////////////////////
  // ////////////////// BORDER //////////////////////
  // ///////////////////////////////////////////////

  //------------------BORDER RADIUS
  var borderRadius,radiusBottomLeft,radiusBottomRight,radiusTopLeft,radiusTopRight;

  if (isCircle(layer)) {
    //if object is a circle:

    borderRadius = layer.frame().width() / 2;
    radiusBottomLeft = radiusBottomRight = radiusTopLeft = radiusTopRight = layer.frame().width() / 2;

  } else if(_properties.clip) {
    //if object is a mask

    var rectObj = layer.layers().firstObject()
    radiusTopLeft = rectObj.path().points()[0].cornerRadius()
    radiusTopRight = rectObj.path().points()[1].cornerRadius()
    radiusBottomRight = rectObj.path().points()[2].cornerRadius()
    radiusBottomLeft = rectObj.path().points()[3].cornerRadius()

  }else if(isRectangle(layer) && layer.layers().firstObject().path().points().length >= 4){
    //if object is a rectangle

    var rectObj = layer.layers().firstObject()
    radiusTopLeft = rectObj.path().points()[0].cornerRadius()
    radiusTopRight = rectObj.path().points()[1].cornerRadius()
    radiusBottomRight = rectObj.path().points()[2].cornerRadius()
    radiusBottomLeft = rectObj.path().points()[3].cornerRadius()

  }

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

  //---------------------BORDER STYLE

  if(layer.class() == MSShapeGroup || isRectangle(layer) || isCircle(layer)){

    var border = layer.style().enabledBorders().length > 0 ? layer.style().enabledBorders()[0] : null
    var borderOptions = layer.style().borderOptions()

    if (border != null) {

      switch ( borderOptions.lineCapStyle() ) {

        case 0:
          properties.lineCap = "butt"
          break;
        case 1:
          properties.lineCap = "round"
          break;
        case 2:
          properties.lineCap = "square"
          break;
      }

      switch ( borderOptions.lineJoinStyle() ) {

        case 0:
          properties.lineJoin = "miter"
          break;
        case 1:
          properties.lineJoin = "round"
          break;
        case 2:
          properties.lineJoin = "bevel"
          break;
      }

      Object.assign(properties,{
        "strokeAlignment" : "center",
        "strokeColor" : rgbToHex(border.color()),
        "strokeDashArray" : "0",
        "strokeDashOffset" : 0,
        "strokeEnabled" : layer.style().borders()[0].isEnabled(),
        "strokeMiterLimit" : layer.style().miterLimit(),
        "strokeWidth" : border.thickness(),
      })

      properties.borderColor = rgbToHex(border.color());
      properties.borderWidth = border.thickness();
      properties.borderEnabled = true;

    }else{
      properties.borderEnabled = false;
      properties.strokeEnabled = false;

    }

  }else{

    var border = getBorder(layer.style());
    if (border != null) {
      properties.borderColor = rgbToHex(border.color());
      properties.borderWidth = border.thickness();
      properties.borderEnabled = true;
    }

  }


  // /////////////////////////////////////////////////
  // ////////////////// SHADOWS /////////////////////
  // ///////////////////////////////////////////////

  properties.boxShadows = []

  var shadow = layer.style().enabledShadows();

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
  var opacity = layer.style().contextSettings().opacity();
  if (opacity != 1) {
    properties.opacity = opacity;
  }

  return properties

}

function getTextStyle(_layer,_parent,_properties){


  var properties = {
    "styledText" : Object.assign({},framerModels.text.styledText)
  }
  properties.styledText.blocks = []
  properties.styledText.cached = {}

  //create block model
  var blockModel = Object.assign({},framerModels.text.styledText.blocks[0])
  blockModel.inlineStyleRanges = []

  //get all individual styles per segment of text
  var atributes = _layer.sketchObject.attributedString().treeAsDictionary().value.attributes
  var styleIndex = [0];
  var styles = [];

  for(var i = 0; i < atributes.length; i++){

    var text = atributes[i].text

    if((text.match(/\n/g) || []).length == 1 && text.length() == 1){
      continue
    }

    var lineAtributes = atributes[i].text.split("\n")
    for(var l = 0; l < lineAtributes.length; l++){

      if(lineAtributes[l] == ""){
        lineAtributes.splice(l,1)
        l--
        continue
      }

      var lineHeight =  atributes[i].NSParagraphStyle.style.maximumLineHeight
      var size =  atributes[i].NSFont.attributes.NSFontSizeAttribute
      var align;

      switch (atributes[i].NSParagraphStyle.style.alignment+"") {
        case "0":
          align = "left"
          break;

          case "1":
          align = "right"
          break;

        case "2":
          align = "center"
          break;

        case "3":
          align = "left"
          break;

        default:
          align = "left"
      }

      if(atributes[i].MSAttributedStringColorAttribute == null){


      }else{

        var color = atributes[i].MSAttributedStringColorAttribute.value + ""
        color = color[0] == "#" ? hexToRGB(color) : rgbaToHsl(color)

      }

      var index = lineAtributes[l].length + styleIndex[styleIndex.length-1]
      styleIndex.push(index)

      styles.push({
        "index" : index,
        "text" : lineAtributes[l],
        "COLOR" : color,
        "FONT" : atributes[i].NSFont.attributes.NSFontNameAttribute,
        "SIZE" : size,
        "LINEHEIGHT" : lineHeight == 0 ?  1 : lineHeight/size,
        "LETTERSPACING" : atributes[i].NSKern,
        "ALIGN" : align
      })

    }
  }

  //arrange styles per line of text
  var stringBlocks = _layer.sketchObject.stringValue().split("\n")
  var blockIndex = [0];
  var blocks = [];
  var styleCount = 0

  var allBlocks

  for (var i = 0; i < stringBlocks.length; i++) {

    blocks[i] = []
    blockIndex.push( blockIndex[i] + stringBlocks[i].length)

    for(var l = styleCount; l < styles.length; l++){
      if(styleIndex[l] < blockIndex[i+1]){

        blocks[i].push(styles[l])
        styleCount++

      }else{
        break
      }
    }

  }

  //generate code from line styles
  var stylesNames = ["COLOR","FONT","SIZE","ALIGN","LETTERSPACING","LINEHEIGHT"]

  for(var i = 0; i < blocks.length; i++){

    blockModel.inlineStyleRanges = []
    blockModel.key = getUniqueIdentifyer("key")
    blockModel.text = stringBlocks[i]
    var newBLockCode = Object.assign({},blockModel)

    for (var l = 0; l < stylesNames.length; l++) {

      var styleLength = 0
      var lastIndex = 0

      for (var s = 0; s < blocks[i].length; s++) {

        var currentBlockStyle = blocks[i][s]
        var nextBlockStyle = blocks[i][s+1] || false
        var currentStyleName = stylesNames[l]

        if( !nextBlockStyle || currentBlockStyle[currentStyleName]+"" != nextBlockStyle[currentStyleName]+""){

          var blockcode = {

            "length" : styleLength + currentBlockStyle.text.length, //FIXME change last offset value. It should not be added
            "offset" : lastIndex,
            "style" : currentStyleName + ":" + currentBlockStyle[currentStyleName]

          }

          //add block style
          newBLockCode.inlineStyleRanges.push(blockcode)

          styleLength = 0
          lastIndex += blockcode.length

        }else{

          styleLength += currentBlockStyle.text.length

        }
      }
    }

    properties.styledText.blocks.push(newBLockCode)

  }

  return properties

}

function getFixedPosition(_layer,_parent){

  var childSize = {
    "width" :     _layer.sketchObject.frame().width(),
    "height" :    _layer.sketchObject.frame().height(),
    "x" :         _layer.sketchObject.frame().x(),
    "y" :         _layer.sketchObject.frame().y(),
    "autoSize" :  false
  }

  var parentSize = {
    "width" :     _parent.width,
    "height" :    _parent.height
  }

  var properties = {}
  properties.centerAnchorX = ( childSize.x + (childSize.width/2) ) / parentSize.width
  properties.centerAnchorY = ( childSize.y + (childSize.height/2) ) / parentSize.height

  if(_parent.clip && !_parent.isCanvas){
    var parentOffset = {
      "top" :    _parent.top    ? _parent.top : null,
      "left" :   _parent.left   ? _parent.left : null,
      "bottom" : _parent.bottom ? _parent.bottom : null,
      "right" :  _parent.right  ? _parent.right : null
    }
  }else{
    var parentOffset = {
      "top" : 0,
      "left" : 0,
      "bottom" : 0,
      "right" : 0
    }
  }

  properties.right    = _layer.sketchObject.hasFixedRight()   ? parentSize.width - (childSize.x + childSize.width) - parentOffset.right  : null
  properties.left     = _layer.sketchObject.hasFixedLeft()    ? childSize.x - parentOffset.left : null
  properties.top      = _layer.sketchObject.hasFixedTop()     ? childSize.y - parentOffset.top : null
  properties.bottom   = _layer.sketchObject.hasFixedBottom()  ? parentSize.height - (childSize.y + childSize.height) - parentOffset.bottom : null

  if( !properties.right && !properties.left && !properties.top && !properties.bottom ){

    if(properties.centerAnchorX *  parentSize.width >  parentSize.width/2){
      properties.right = parentSize.width - (childSize.x + childSize.width)
      properties.left = null
    }else{
      properties.right = null
      properties.left = childSize.x
    }

    if(properties.centerAnchorY *  parentSize.height >  parentSize.height/2){
      properties.bottom = parentSize.height - (childSize.y + childSize.height)
      properties.top = null
    }else{
      properties.bottom = null
      properties.top = childSize.y
    }

  }

  return properties

}

function getFixedSize(_layer,_parent){



  var properties = {}
  var layer = _layer.sketchObject ? _layer.sketchObject : _layer

  properties.width = layer.frame().width()
  properties.height = layer.frame().height()

  properties.widthFactor = !layer.hasFixedWidth() ? layer.frame().width()/_parent.width : null
  properties.heightFactor = !layer.hasFixedHeight() ? layer.frame().height()/_parent.height : null

  return properties

}

function getBoundingBox(_layers){

  var _properties = {}

  var firstLayerFrame = !_layers[0].frame ? _layers[0] : {
    "x" :       _layers[0].frame().x(),
    "y" :       _layers[0].frame().y(),
    "width" :   _layers[0].frame().width(),
    "height" :  _layers[0].frame().height()
  }

  var TL = {
    "x" : firstLayerFrame.x,
    "y" : firstLayerFrame.y
  }

  var BR = {
    "x" : firstLayerFrame.x + firstLayerFrame.width,
    "y" : firstLayerFrame.y + firstLayerFrame.height
  }

  for (var i = 0; i < _layers.length; i++) {

    var frame = !_layers[i].frame ? _layers[i] : {
      "x" :       _layers[i].frame().x(),
      "y" :       _layers[i].frame().y(),
      "width" :   _layers[i].frame().width(),
      "height" :  _layers[i].frame().height()
    }

    TL.x = TL.x < frame.x                   ? TL.x : frame.x
    TL.y = TL.y < frame.y                   ? TL.y : frame.y
    BR.x = BR.x > (frame.x + frame.width)   ? BR.x : (frame.x + frame.width)
    BR.y = BR.y > (frame.y + frame.height)  ? BR.y : (frame.y + frame.height)

  }

  _properties.x = TL.x
  _properties.y = TL.y
  _properties.width = BR.x - TL.x
  _properties.height = BR.y - TL.y

  return _properties

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////   ADD FRAMER OBJ FROM MODELS  /////////////////////////
////////////////////////////////////////////////////////////////////////////////

function createCanvas(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.artboard)
  newObj = Object.assign(newObj,_properties)
  newObj = Object.assign(newObj, {
    "x" : _layer.sketchObject.absoluteRect().rulerX(),
    "y" : _layer.sketchObject.absoluteRect().rulerY(),
    "width" : _layer.sketchObject.frame().width(),
    "height" : _layer.sketchObject.frame().height(),
    "clip" : true
  })

  _parent.children.push(newObj)

  return newObj

}

function createRectangle(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.rectangle)

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

function createPath(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.path)

  var pathObj =  _layer.sketchObject ? _layer.sketchObject.layers()[0] : _layer
  var points = pathObj.path().points()
  var pathSegments = []

  if(_layer.isShape){

    var pathFrame = {
      "x" : parseFloat((pathObj.frame().x()).toFixed(3)),
      "y" : parseFloat((pathObj.frame().y()).toFixed(3)),
      "height" : parseFloat((pathObj.frame().height()).toFixed(3)),
      "width" : parseFloat((pathObj.frame().width()).toFixed(3))
    }

  }else{

    var pathFrame = {
      "x" : 0,
      "y" : 0,
      "height" : parseFloat((pathObj.frame().height()).toFixed(3)),
      "width" : parseFloat((pathObj.frame().width()).toFixed(3))
    }

  }

  for (var i = 0; i < points.length; i++) {

    var newSegment = Object.assign({}, framerModels.pathSegment)
    var pathX = parseFloat(pathFrame.x + parseFloat(( pathFrame.width * points[i].point().x).toFixed(3)))
    var pathY = parseFloat(pathFrame.y + parseFloat(( pathFrame.height * points[i].point().y).toFixed(3)))
    var pointGlobalPos = {

      "x" : pathX,
      "y" : pathY,

      "handleInX" : parseFloat((pathFrame.x + ( pathFrame.width * points[i].curveTo().x) - pathX).toFixed(3)),
      "handleInY" : parseFloat((pathFrame.y + ( pathFrame.height * points[i].curveTo().y) - pathY).toFixed(3)),

      "handleOutX" : parseFloat((pathFrame.x + ( pathFrame.width * points[i].curveFrom().x) - pathX).toFixed(3)),
      "handleOutY" : parseFloat((pathFrame.y + ( pathFrame.height * points[i].curveFrom().y) - pathY).toFixed(3)),

    }

    if(_layer.isShape && _layer.sketchObject.layers()[0].class() == MSRectangleShape){
      pointGlobalPos.cornerRadius = points[i].point().cornerRadius
    }

    switch ( points[i].curveMode() ) {

      case 1:
        pointGlobalPos.handleMirroring = "straight"
        break;
      case 2:
        pointGlobalPos.handleMirroring = "symmetric"
        break;
      case 3:
        pointGlobalPos.handleMirroring = "disconnected"
        break;
      case 4:
        pointGlobalPos.handleMirroring = "disconnected"
        break;
    }

    Object.assign(newSegment, pointGlobalPos)
    pathSegments.push(newSegment)

  }

  if(_layer.isShape){

    if(!pathObj.path().isClosed()){
      _properties =  Object.assign(_properties, { "pathClosed" : false })
    }else{
      _properties =  Object.assign(_properties, { "pathClosed" : true })
    }

  }else{

    _properties =  Object.assign(_properties, {  "pathClosed" : true })

  }

  var pathFrame = _layer.isShape ? _layer.sketchObject.frame() : _layer.frame()

  newObj = Object.assign(newObj, {
    "x" : pathFrame.x(),
    "y" : pathFrame.y(),
    "width" : pathFrame.width(),
    "height" : pathFrame.height()
  })
  newObj = Object.assign(newObj, { "pathSegments" : pathSegments })
  newObj = Object.assign(newObj,_properties)

  if(_layer.sketchObject){
    _parent.children.push(newObj)
    newObj = Object.assign(newObj,getStyle(_layer,_parent,_properties))
  }else{
    return newObj
  }


}

function createFrame(_layer,_parent,_properties,_isGroup){

  var newObj = Object.assign({}, framerModels.frame)
  newObj = Object.assign(newObj, {
    "width" : _layer.sketchObject.frame().width(),
    "height" : _layer.sketchObject.frame().height()
  })
  newObj = Object.assign(newObj,_properties)
  newObj = Object.assign(newObj,getStyle(_layer,_parent,_properties,_isGroup))
  _parent.children.push(newObj)

  return newObj

}

function createText(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.text)

  //get text center
  newObj = Object.assign(newObj ,{
    "width" : _layer.sketchObject.frame().width(),
    "height" :  _layer.sketchObject.frame().height(),
    "x" : _layer.sketchObject.frame().x(),
    "y" : _layer.sketchObject.frame().y(),
    "autoSize" : false
  })

  newObj = Object.assign(newObj, _properties)
  newObj = Object.assign(newObj,getTextStyle(_layer,_parent,_properties))
  newObj = Object.assign(newObj,getFixedPosition(_layer,_parent))

  _parent.children.push(newObj)

}

function createImage(_layer,_parent,_properties){

  var thisImageRef = JSON.parse(MSJSONDataArchiver.archiveStringWithRootObject_error_(_layer.sketchObject.immutableModelObject(), nil)).image._ref.split("/")[1];
  if(!allImages[thisImageRef]){
    var imageData = _layer.sketchObject.image().data()
    var imageUrl = url.path() + "/images/design/" + thisImageRef + ".png"
    imageData.writeToFile_atomically(imageUrl, "YES");

    allImages[thisImageRef] = imageData

  }else{
    imageData = allImages[thisImageRef]
  }


  _properties.originalFilename = thisImageRef + ".png"
  _properties.image = thisImageRef + ".png"

  var newObj = Object.assign({}, framerModels.image)
  newObj = Object.assign(newObj, {
    "x" : _layer.sketchObject.frame().x(),
    "y" : _layer.sketchObject.frame().y(),
    "width" : _layer.sketchObject.frame().width(),
    "height" : _layer.sketchObject.frame().height()
  })
  newObj = Object.assign(newObj,_properties)
  newObj = Object.assign(newObj,getStyle(_layer,_parent,_properties))
  _parent.children.push(newObj)

  return newObj

}

function createComposedPath(_layer,_parent,_properties){

  var subLayers = _layer.sketchObject.layers()
  var lastLayer = subLayers[0]

  var allParents = []
  var layerToBeGrouped = []

  //get tree structure from sublayers
  for (var i = 0; i < subLayers.length-1; i++) {

    layerToBeGrouped.push(subLayers[i])

    //group layers with similar booleanOperation
    if(subLayers[i].booleanOperation() != subLayers[i+1].booleanOperation() && i != 0){

      var frame = getBoundingBox(layerToBeGrouped)
      var nextParent = Object.assign({}, framerModels.combinedPath)
      nextParent = Object.assign(nextParent, {
        "id" : getUniqueIdentifyer("id"),
        "name" : subLayers[i].name() + "-Group",
        "x" : frame.x,
        "y" : frame.y,
        "width" : frame.width,
        "height" : frame.height,
        "pathBoolean" : subLayers[i].booleanOperation() == -1 ? 3 : subLayers[i].booleanOperation(),
        "children" : layerToBeGrouped
      })

      layerToBeGrouped = [nextParent]
      allParents.push(nextParent)

    }

    //add first parent
    if(i == subLayers.length-2){

      layerToBeGrouped.push(subLayers[i+1])

      var frame = getBoundingBox(layerToBeGrouped)
      var lastParent = Object.assign({}, framerModels.combinedPath)
      lastParent = Object.assign(lastParent, {
        "id" : getUniqueIdentifyer("id"),
        "parentid" : _parent.id,
        "name" : _layer.sketchObject.name()+"",
        "x" : _layer.sketchObject.frame().x(),
        "y" : _layer.sketchObject.frame().y(),
        "width" : _layer.sketchObject.frame().width(),
        "height" : _layer.sketchObject.frame().height(),
        "pathBoolean" : subLayers[subLayers.length-1].booleanOperation() == -1 ? 3 : subLayers[subLayers.length-1].booleanOperation(),
        "children" : layerToBeGrouped
      })

      allParents.push(lastParent)

    }
  }

  //create paths and adjust positions based on parent LAYERS
  adjustPos(allParents[allParents.length-1],false,{
    "x" : 0,
    "y" : 0
  })

  function adjustPos(_parent,_adjustPos,_offset){

    for (var i = 0; i < _parent.children.length; i++) {

      if(_parent.children[i].__class == "BooleanShapeNode"){
      //create parent

        if(_adjustPos){
          _parent.children[i].x = _parent.children[i].x - _offset.x
          _parent.children[i].y = _parent.children[i].y - _offset.y
        }

        _parent.children[i].parentid = _parent["id"]
        adjustPos(_parent.children[i],true, {
          "x" : _offset.x + _parent.children[i].x,
          "y" : _offset.y + _parent.children[i].y
        })

      }else{
      //create path

      var newPath = createPath(_parent.children[i],_parent,getShapeProperties(_parent.children[i],_parent))

        if(_adjustPos){
          newPath.x = _parent.children[i].frame().x() - _offset.x
          newPath.y = _parent.children[i].frame().y() - _offset.y
        }

        _parent.children[i] = newPath

      }
    }
  }

  allParents[allParents.length-1] = Object.assign(allParents[allParents.length-1],getStyle(_layer,_parent,_properties))
  _parent.children.push(allParents[allParents.length-1])

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////   SKETCH STYLING UTILITIES   //////////////////////////
////////////////////////////////////////////////////////////////////////////////

function isRectangle(layer) {

  if(!layer.layers || layer.layers().length == 0){
    return false
  }

  var layerCount = layer.layers().count();
  var layerClass = layer.layers()[0].class() + ""

  if (layerCount == 1 && layerClass == "MSRectangleShape") {
    return true;
  } else {
    return false;
  }
}

function isCircle(layer) {

  if(!layer.layers || layer.layers().length == 0){
    return false
  }

  var layerCount = layer.layers().count();
  var layerClass = layer.layers()[0].class() + "";
  var width = layer.frame().width();
  var height = layer.frame().height();

  if (layerCount == 1 && layerClass == "MSOvalShape") {
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

function hexToRGB(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
    }
}

function rgbaToHsl(_colorString) {

  var values = _colorString.split("(")[1].split(")")[0].split(",")

  var r = parseFloat(values[0])
  var g = parseFloat(values[1])
  var b = parseFloat(values[2])
  var a = parseFloat(values[3])

  // r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b)
  var min = Math.min(r, g, b);

  var h = (max + min) / 2; //hue
  var s = (max + min) / 2; //saturation
  var l = (max + min) / 2; //lightness

  if (max == min) {

    h = s = 0; // achromatic

  } else {

    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;

  }

  h = parseFloat((h*360).toFixed(0))
  s = parseFloat((s*100).toFixed(2))
  l = parseFloat((l*100).toFixed(2))
  a = parseFloat(a.toFixed(2))

  return 'hsla(' + h + ',' + s + '%,' + l  + '%,' + a + ')';
}

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

function getGradient(_gradient){

  var gradientData = _gradient.split(" ")
  var angle = Math.abs(parseInt(gradientData[0].slice(0,-3)))
  var start = gradientData[1].trim().split(" ")[0]
  var end = gradientData[3].trim().split(" ")[0]

  return {
    "__class" : "LinearGradient",
    "alpha" : 1,
    "angle" :  angle,
    "start" : start,
    "end" : end
  }

}

function getBorder(style) {

  var borders = style.enabledBorders();
  var border = null;

  var i, len;
  for (i = 0, len = borders.length; i < len; i++) {
    var fillType = borders[i].fillType();
    if (fillType == 0) {
      border = borders[i];
    }
  }

  return border;
}

function getShadow(style) {
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
  var exportPath = _url.path() + "/framer/design.vekter"
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
