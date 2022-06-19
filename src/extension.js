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
const ExtensionManager = imports.ui.main.extensionManager;
const Me             = ExtensionUtils.getCurrentExtension();
const lib            = Me.imports.lib;

////////////////////////////////////////////////////////////
// Global Variables
let mySetting;
let wallpaperOverlaySetting = null;
let handlerMode;
let handlerFrequency;
let handlerExtensionManager;
let handlerWallpaperOverlaySetting;
let timeout;
let imageIndex = -1;

function changeWallpaperSequentially(wallpaperSetter){
  return ()=>{
    try{
      let wallpaperList = lib.getWallpaperList();
      if(wallpaperList.length == 0){
        return true;
      }
      imageIndex = imageIndex+1;
      if(imageIndex >= wallpaperList.length) imageIndex = 0;
      wallpaperSetter(wallpaperList[imageIndex]);     
      return true;
    }catch{
      updateMainloop();
    }
  }
}
function changeWallpaperRandomly(wallpaperSetter){
  return ()=>{
    try{
      let wallpaperList = lib.getWallpaperList();
      if(wallpaperList.length == 0){
        return true;
      }
      let idx = Math.floor(Math.random() * wallpaperList.length);
      wallpaperSetter(wallpaperList[idx]);   
      return true;
    } catch{
      updateMainloop();
    }
    
  }
  
}

function updateMainloop(checkWO = 0){
  Mainloop.source_remove(timeout);
  let wallpaperSetter = lib.getWallpaperSetterFunction();
  lib.setErrorMsg("");
  try{
    if(checkWO)
    {
      let newSetting = lib.getWallpaperOverlaySetting();
      if(newSetting != null)
      {
        if(wallpaperOverlaySetting != newSetting){
          // this means wallpaper overlay is installed /reinstalled /updated
          if(handlerWallpaperOverlaySetting != null && wallpaperOverlaySetting != null)
          wallpaperOverlaySetting.disconnect(handlerWallpaperOverlaySetting);
          wallpaperOverlaySetting = newSetting;
          handlerWallpaperOverlaySetting = wallpaperOverlaySetting.connect("changed::is-auto-apply",() => {
            updateMainloop(1);
          });
        }
        if(wallpaperOverlaySetting.get_boolean("is-auto-apply")){
          // if auto apply is on
          wallpaperSetter = lib.getWallpaperWithOverlaySetterFunction(wallpaperOverlaySetting);
          lib.setErrorMsg("UWO"); // Using Wallpaper Overlay
        }      
      }
    }
  }
  catch{}
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
    handlerMode = mySetting.connect("changed::switching-mode",()=>{
      updateMainloop(0);
    });
    handlerFrequency = mySetting.connect("changed::frequency",()=>{
      updateMainloop(0);
    });
    handlerExtensionManager = ExtensionManager.connect("extension-state-changed",() => {
      updateMainloop(1);
    });
  }
  catch(e){lib.saveExceptionLog(e)}
}

function disable() {
  if(handlerFrequency != null)
  mySetting.disconnect(handlerFrequency);
  if(handlerMode != null)
  mySetting.disconnect(handlerMode);
  if(handlerExtensionManager != null)
  ExtensionManager.disconnect(handlerExtensionManager);
  if(handlerWallpaperOverlaySetting != null && wallpaperOverlaySetting != null)
  {
    wallpaperOverlaySetting.disconnect(handlerWallpaperOverlaySetting);
    wallpaperOverlaySetting.disconnect(handlerWallpaperOverlaySetting);
  }
  Mainloop.source_remove(timeout);
  handlerExtensionManager = null;
  handlerFrequency = null;
  handlerMode = null;
  timeout = null;
  mySetting = null;
}


