# SketchToVekter
A Sketch plugin that exports your layers from your sketch file to Framer Design.

The plugin will not generate code in your Framer project. It rather uses export the layer from the sketch file to a design.vekter file that is used to create the layers in Framer Code tab.

# Installation

1. [Download](https://github.com/hugoluc/sketchToFramer/archive/master.zip) the plugin.
2. Unzip the file and double click

## Usage

1. Select the layer you want to export on Fketch.
2. Open the "Plugins" menu on Sketch and select sketchtoFramer.
3. Select the folder of the project you want sketchToFramer to export to.
4. sketchToFramer will create a duplicate of the layers you selected in the Design tab inside Framer for the project you selected.

# Notes

sketchToFramer uses the design.vekter that can be found inside your project folder. Since it overwrites the file, all layers and designs are overwrites by the plugin. Because of this I recommend updating your designs in sketch and re-importing to avoid loosing data. 

