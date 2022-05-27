/*
* Name: Wallpaper Switcher
* Description: Extension to automatically Change wallpaper after a given interval
* Author: Rishu Raj
*/

////////////////////////////////////////////////////////////
//Const Variables
const Gio = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const lib            = Me.imports.lib;

////////////////////////////////////////////////////////////
// Global Variables
let mySetting;
let handlerFrequency;
let handlerWallpaperOverlaySupport;
let timeout;
let imageIndex = -1;
// let wallpaperList = [];

function changeWallpaperSequentially(wallpaperSetter){
  return ()=>{
    let wallpaperList = lib.getWallpaperList();
    if(wallpaperList.length == 0){
      return true;
    }
    try{
      imageIndex = imageIndex+1;
      if(imageIndex >= wallpaperList.length) imageIndex = 0;
      wallpaperSetter(wallpaperList[imageIndex]);     
    }
    catch(e)
    {
      lib.saveExceptionLog(e);
    }
    return true;
  }
}
function changeWallpaperRandomly(wallpaperSetter){
  return ()=>{
    let wallpaperList = lib.getWallpaperList();
    if(wallpaperList.length == 0){
      return true;
    }
    try{
      let idx = Math.floor(Math.random() * wallpaperList.length);
      wallpaperSetter(wallpaperList[idx]);   
    }
    catch(e)
    {
      lib.saveExceptionLog(e);
    }
    return true;
  }
  
}

function updateMainloop(){
  Mainloop.source_remove(timeout);
  let wallpaperSetter = lib.getWallpaperOverlaySupport()?lib._setWallpaperWithOverlay:lib._setWallpaper;
  // let wallpaperSetter = lib._setWallpaper;
  timeout = Mainloop.timeout_add_seconds(lib.getFrequency(),
  lib.getSwitchingMode()? changeWallpaperRandomly(wallpaperSetter):
  changeWallpaperSequentially(wallpaperSetter)
  );
}



////////////////////////////////////////////////////////////
// Extension.js default functions

function init() {

}

function enable() {
  try{
    mySetting = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher');
    updateMainloop();
    wallpaperList = lib.getWallpaperList();
    handlerFrequency = mySetting.connect("changed::frequency",()=>{
      updateMainloop();
    });
    handlerWallpaperOverlaySupport = mySetting.connect("changed::wallpaper-overlay-support",()=>{
      updateMainloop();
    });
  }
  catch(e){lib.saveExceptionLog(e)}
}

function disable() {
  mySetting.disconnect(handlerFrequency);
  mySetting.disconnect(handlerWallpaperOverlaySupport);
  Mainloop.source_remove(timeout);
  timeout = null;
  mySetting = null;
}


