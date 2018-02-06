var layerNames = {};
var framerLayers = [];
var originalVekter = {};
var alphabetArray = 'abcdefghijklmnopqrstuvwxyz'.split('');

var globelIdentifyers = {
  "id" : "00000",
  "key" : "000"
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
    "id" : globelIdentifyers.id
  })

  //Generate framer object models
  framerModels.artboard = Object.assign({}, originalVekter.root.children[0])
  framerModels.artboard = Object.assign(framerModels.artboard, {
    "children" : [],
    "id" : "ART"
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

    ///////////////////////////////////////////////  FRAME
    if(_layer.isGroup) {

      var properties = getFrameProperties(_layer,_parent))

      if(_layer.isArtboard) {
        createCanvas(_layer,_parent,properties)
      }else{
        //createFrame
        createFrame(_layer,_parent,properties)
      }

      _layer.iterate(function(_children){
        addFramerLayer(_children, _parent.children[_parent.children.length-1])
      })

    ///////////////////////////////////////////////  SHAPES + PATH
    }else if(_layer.isShape){

      debugger

      var properties = getShapeProperties(_layer,_parent))

      if(_layer.sketchObject.layers().length > 0 && _layer.sketchObject.layers()[_layer.sketchObject.layers().length-1].booleanOperation() > -1 ){

        createComposedPath(_layer,_parent,properties)

      }else if(_layer.sketchObject.layers()[0].class() == MSShapePathLayer){
        createPath(_layer,_parent,properties)

      }else if (_layer.sketchObject.layers()[0].class() == MSRectangleShape){
        createRectangle(_layer,_parent,properties)

      }else{
        createPath(_layer,_parent,properties)
      }

    ///////////////////////////////////////////////  TEXT
    }else if(_layer.isText){
      var properties = getShapeProperties(_layer,_parent))
      createText(_layer,_parent,properties)
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

///////////////////////////////////////////////////////////////////

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

  var shadow = getShadow(layer.style());
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
///////////////////   GET PROPERTIES FROM SKETCH LAYERS   //////////////////////
////////////////////////////////////////////////////////////////////////////////

function getShapeProperties(_layer,_parent){

  var properties = {
    "id" : getUniqueIdentifyer("id"),
    "parentid" : _parent["id"],
    "name" : _layer.sketchObject ? _layer.sketchObject.name() + "" : _layer.name() + ""
  }

  return properties
}

function getFrameProperties(_layer,_parent){

  var properties = getShapeProperties(_layer,_parent)
  properties = Object.assign(properties, getFixedPosition(_layer,_parent) )

  var name = _layer.sketchObject.name()
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
        "widthFactor" : null,
        "heightFactor" : null
      })

      var propertiesStr = name.substring(openBraquet+1,closeBraquet)

      if(propertiesStr.indexOf("M") != -1){ properties.clip = true }

      if(propertiesStr.indexOf("W") != -1){
        //width factor null
      }

      if(propertiesStr.indexOf("H") != -1){
      //height factor null
      }
    }

    return properties

  }else{
    //layer with no properties specifyed in the layer name

    Object.assign(properties, {
      "children" : [],
      "widthFactor" : null,
      "heightFactor" : null,
      "clip" : false,
    })

    return properties
  }

}

function getStyle(_layer,_parent,_properties){

  var properties = {}
  var layer = _layer.sketchObject ? _layer.sketchObject : _layer

  // /////////////////////////////////////////////////
  // ////////////////// FILL ////////////////////////
  // ///////////////////////////////////////////////

  var fills = layer.style().enabledFills();

  if(fills.length > 0){

    properties.fillEnabled = true;

    var fillType = fills[0].fillType();

    if (fillType == 0) {

      properties.fillColor = rgbaCode(fills[0].color())

    }else if(fillType == 1){
      properties.fillEnabled = true;
      properties.fillGradient = getGradient(layer.style().enabledFills()[0].gradient().gradientStringWithMasterAlpha(0))
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

    // borderRadius = layer.frame.width() / 2;
    // radiusBottomLeft,radiusBottomRight,radiusTopLeft,radiusTopRight = layer.frame.width() / 2;

  } else if(_properties.clip) {
    //if object is a mask

    var rectObj = layer.layers().firstObject().layers().firstObject()
    radiusTopLeft = rectObj.path().points()[0].cornerRadius()
    radiusTopRight = rectObj.path().points()[1].cornerRadius()
    radiusBottomRight = rectObj.path().points()[2].cornerRadius()
    radiusBottomLeft = rectObj.path().points()[3].cornerRadius()

  }else if(isRectangle(layer)){
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

    var lineAtributes = atributes[i].text.trim().split("\n")
    for(var l = 0; l < lineAtributes.length; l++){

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

      var color = atributes[i].MSAttributedStringColorAttribute.value + ""
      color = color[0] == "#" ? hexToRGB(color) : rgbaToHsl(color)

      styles.push({

          "index" : lineAtributes[l].length + styleIndex[i+l],
          "text" : lineAtributes[l],
          "COLOR" : color,
          "FONT" : atributes[i].NSFont.attributes.NSFontNameAttribute,
          "SIZE" : size,
          "LINEHEIGHT" : lineHeight == 0 ?  1 : lineHeight/size,
          "LETTERSPACING" : atributes[i].NSKern,
          "ALIGN" : align

      })
      styleIndex.push(lineAtributes[l].length + styleIndex[i+l])
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
    "width" : _layer.sketchObject.frame().width(),
    "height" :  _layer.sketchObject.frame().height(),
    "x" : _layer.sketchObject.frame().x(),
    "y" : _layer.sketchObject.frame().y(),
    "autoSize" : false
  }

  var parentSize = {
    "width" : _parent.width,
    "height" :  _parent.height
  }

  var properties = {}
  properties.centerAnchorX = ( childSize.x + (childSize.width/2) ) / parentSize.width
  properties.centerAnchorY = ( childSize.y + (childSize.height/2) ) / parentSize.height


  if( !properties.right && !properties.left && !properties.top && !properties.bottom ){
    // properties.x = childSize.x
    // properties.y = childSize.y

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

  }else{

    properties.right    = _layer.sketchObject.hasFixedRight()   ? parentSize.width - (childSize.x + childSize.width) : null
    properties.left     = _layer.sketchObject.hasFixedLeft()    ? childSize.x : null
    properties.top      = _layer.sketchObject.hasFixedTop()     ? childSize.y : null
    properties.bottom   = _layer.sketchObject.hasFixedBottom()  ? parentSize.height - (childSize.y + childSize.height) : null

  }

  return properties

}

function getPosAndSize(_layer,resetChildren){

  sketchObject = _layer.sketchObject ? _layer.sketchObject : _layer

  var properties = {
    "x" : sketchObject.frame().x(),
    "y" : sketchObject.frame().y(),
    "width" : sketchObject.frame().width(),
    "height" : sketchObject.frame().height(),
  }

  if(resetChildren){ properties.children = [] }

  return properties

}

function getFrameFromLayers(_layer1, _layer2){

  var _properties = {}

  l01Frame = _layer1.frame ? _layer1.frame() : _layer1
  l02Frame = _layer2.frame ? _layer2.frame() : _layer2

  var L01Pos = {
    "x" :       _layer1.frame ? _layer1.frame().x()       : _layer1.x,
    "y" :       _layer1.frame ? _layer1.frame().y()       : _layer1.y,
    "width" :   _layer1.frame ? _layer1.frame().width()   : _layer1.width,
    "height" :  _layer1.frame ? _layer1.frame().height()  : _layer1.height
  }

  var L02Pos = {
    "x" :       _layer2.frame ? _layer2.frame().x()       : _layer2.x,
    "y" :       _layer2.frame ? _layer2.frame().y()       : _layer2.y,
    "width" :   _layer2.frame ? _layer2.frame().width()   : _layer2.width,
    "height" :  _layer2.frame ? _layer2.frame().height()  : _layer2.height
  }

  if(L01Pos.x < L02Pos.x){
    //L01 on the left
    _properties.x = L01Pos.x
    _properties.width = (L02Pos.x + L02Pos.width) - L01Pos.x

  }else{
    //L02 on the left
    _properties.x = L02Pos.x
    _properties.width = (L01Pos.x + L01Pos.width) - L02Pos.x
  }

  if(L01Pos.y < L02Pos.y){
    //L01 on the left
    _properties.y = L01Pos.y
    _properties.height = (L02Pos.y + L02Pos.height) - L01Pos.y

  }else{
    //L02 on the left
    _properties.y = L02Pos.y
    _properties.height = (L01Pos.y + L01Pos.height) - L02Pos.y

  }

  return _properties

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////   ADD FRAMER OBJ FROM MODELS  /////////////////////////
////////////////////////////////////////////////////////////////////////////////

function createCanvas(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.artboard)
  newObj = Object.assign(newObj, {
    "x" : _layer.sketchObject.absoluteRect().rulerX(),
    "y" : _layer.sketchObject.absoluteRect().rulerY(),
    "width" : _layer.sketchObject.frame().width(),
    "height" : _layer.sketchObject.frame().height()
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

function createPath(_layer,_parent,_properties){

  //FIXME add suport to dashed

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

function createFrame(_layer,_parent,_properties){

  var newObj = Object.assign({}, framerModels.frame)
  newObj = Object.assign(newObj, {
    "width" : _layer.sketchObject.frame().width(),
    "height" : _layer.sketchObject.frame().height()
  })
  newObj = Object.assign(newObj,_properties)
  newObj = Object.assign(newObj,getStyle(_layer,_parent,_properties))
  _parent.children.push(newObj)

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

function createComposedPath(_layer,_parent,_properties){

  var subLayers = _layer.sketchObject.layers()
  var lastLayer = subLayers[0]
  var secondToLastLayer = subLayers[1]

  var allParents = []

  var lastParent =  Object.assign({}, framerModels.combinedPath)
  lastParent = Object.assign(lastParent, _properties)
  lastParent = Object.assign(lastParent, getFrameFromLayers(lastLayer,secondToLastLayer))
  lastParent = Object.assign(lastParent, {
    "x" : lastParent.x - _layer.sketchObject.frame().x(),
    "y" : lastParent.y - _layer.sketchObject.frame().y(),
    "name" : secondToLastLayer.name() + "-Group",
    "children" : []
  })
  allParents.push(lastParent)

  var lastChild = createPath(lastLayer,lastParent,getShapeProperties(lastLayer,lastParent))
  lastChild = Object.assign(lastChild, {
    "x" : lastLayer.frame().x() - lastParent.x,
    "y" : lastLayer.frame().y() - lastParent.y,
  })
  lastParent.children.push(lastChild)

  var secondToLastChild = createPath(secondToLastLayer,lastParent,getShapeProperties(secondToLastLayer,lastParent))
  secondToLastChild = Object.assign(secondToLastChild, {
    "x" : secondToLastLayer.frame().x() - lastParent.x,
    "y" : secondToLastLayer.frame().y() - lastParent.y,
  })
  lastParent.children.push(secondToLastChild)

  if(subLayers.length > 2){

    for (var i = 0; i <subLayers.length-2; i++) {

      //get new layer in line
      var nextLayer = subLayers[2+i]

      //create parent based on new layer
      var nextParent = Object.assign({}, framerModels.combinedPath)
      nextParent = Object.assign(nextParent, {
        "id" : getUniqueIdentifyer("id"),
        "name" : nextLayer.name() + "-Group",
        "children" : []
      })

      //create frame based on previous parent and current layer
      nextParent = Object.assign(nextParent, getFrameFromLayers(nextLayer,allParents[i]))
      allParents.push(nextParent)

      //set correct data for previous parent
      nextParent.children.push(allParents[i])
      allParents[i].parentid = nextParent["id"]


      //create next child
      var nextChild = createPath( nextLayer, allParents[allParents.length-1], getShapeProperties(nextLayer, allParents[allParents.length-1]) )
      allParents[i].parentid = nextParent["id"]
      allParents[allParents.length-1].children.push(nextChild)

    }

  }

  //Combined    id.00005  //  p.00001   -- nextParent             00,00 // 00,00   -> 00,00
  //00          id.00006  //  p.00006   -- nextLayer              00,00 // 00,00   -> 00,00
  //01-group    id.00002  //  p.0005    -- lastParent             00,10 // --,--   -> 00,00
  //01          id.00004  //  p.0002    -- secondToLastChild      00,00 // 00,10   -> 00,10 *
  //02          id.00003  //  p.0002    -- lastChild              00,10 // 00,20   -> 00,20 *


  var firstParent = allParents[allParents.length-1]
  firstParent.name = _properties.name
  firstParent.parentid = _parent["id"]
  firstParent.x = _layer.sketchObject.frame().x(),
  firstParent.y = _layer.sketchObject.frame().y(),
  firstParent.width = _layer.sketchObject.frame().width(),
  firstParent.height = _layer.sketchObject.frame().height(),

  _parent.children.push(firstParent)

  console.log(allParents[0].name,allParents[0].x,allParents[0].y)
  console.log(allParents[1].name,allParents[1].x,allParents[1].y)

  debugger

}

////////////////////////////////////////////////////////////////////////////////
////////////////////////   SKETCH STYLING UTILITIES   //////////////////////////
////////////////////////////////////////////////////////////////////////////////

function isRectangle(layer) {

  if(layer.layers().length == 0){
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

  console.log(layer.layers());

  if(layer.layers().length == 0){
    return false
  }

  var layerCount = layer.layers().count();
  var layerClass = layer.layers()[0].class() + "";
  var width = layer.frame().width();
  var height = layer.frame().height();

  if (layerCount == 1 && layerClass == "MSOvalShape" && width == height) {
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

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

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
