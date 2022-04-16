/*
* Name: Wallpaper Switcher
* Description: Extension to automatically Change wallpaper after a given interval
* Author: Rishu Raj
*/

const Gio = imports.gi.Gio;
const GLib  = imports.gi.GLib;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

let settings;
let imageNames;
let imgidx = -1;
let refreshTime = 10;
let oldrefreshTime = 10;
let wallpaperPath = "";
let logSize = 8000; // about 8k
let home_dir = GLib.get_home_dir();
let allowedExtensions = ["jpg","png","jpeg"];


function setWallpaper(path){
  /*
   inspired from:
   https://github.com/ifl0w/RandomWallpaperGnome3/blob/develop/randomwallpaper%40iflow.space/wallpaperController.js
      */
  let background_setting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  path = "file://" + path;
  setPictureUriOfSettingsObject(background_setting, path);
  if (settings.get_boolean('change-lock-screen')) {
    let screensaver_setting = new Gio.Settings({schema: "org.gnome.desktop.screensaver"});
    setPictureUriOfSettingsObject(screensaver_setting, path);
  }
}

function setPictureUriOfSettingsObject(bsettings, path) {
  /*
   inspired from:
   https://bitbucket.org/LukasKnuth/backslide/src/7e36a49fc5e1439fa9ed21e39b09b61eca8df41a/backslide@codeisland.org/settings.js?at=master
   */
  // saveExceptionLog("Setting: "+path+ " " + String(imgidx)+" " + String(imageNames.length)+"\n");
  if (bsettings.is_writable("picture-uri")) {
    // Set a new Background-Image (should show up immediately):
    let rc = bsettings.set_string("picture-uri", path);
    if (rc) {
      Gio.Settings.sync(); // Necessary: http://stackoverflow.com/questions/9985140
    } else {
      saveExceptionLog("Could not set lock screen wallpaper.");
    }
  } else {
    saveExceptionLog("Could not set wallpaper.");
  }
  if (shellVersion >= 42){
  if (bsettings.is_writable("picture-uri-dark")) {
    // Set a new Background-Image (should show up immediately):
    let rc = bsettings.set_string("picture-uri-dark", path);
    if (rc) {
      Gio.Settings.sync(); // Necessary: http://stackoverflow.com/questions/9985140
    } else {
      saveExceptionLog("Could not set lock screen wallpaper.");
    }
  } else {
    saveExceptionLog("Could not set dark wallpaper.");
  }
  }
}

function updateWallpaperPaths(){
  try{
    let tempwallpaperPath = settings.get_string('wallpaper-path');
    let iNames = [];
    let wfolder = Gio.file_new_for_path(tempwallpaperPath);
    let enumerator = wfolder.enumerate_children("standard::name, standard::type",Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    let child;
    while ((child = enumerator.next_file(null))){
      // check if it is a file
      if( child.get_file_type() == Gio.FileType.REGULAR)
      {
        // check extension
        let ext = child.get_name().split(".").pop();
        if(allowedExtensions.indexOf(ext) != -1)
        {
          iNames.push(child.get_name());
        }
      }
    }
    if(iNames.length != 0){
      imageNames = iNames;
      wallpaperPath = tempwallpaperPath;
    }
  }
  catch(e){
    saveExceptionLog(e);
  }
}

function updateRefreshTime(){
  refreshTime = settings.get_double('frequency');
  if(oldrefreshTime != refreshTime){
    Mainloop.source_remove(timeout);
    timeout = Mainloop.timeout_add_seconds(refreshTime, changeWallpaper);
    oldrefreshTime = refreshTime;
  }
}

function changeWallpaper(){
  // read all files in the folder
  // set wallpaper
  try{
    updateWallpaperPaths();
    updateRefreshTime();
    if(imageNames.length == 0){
      saveExceptionLog("No images found in the folder "+ wallpaperPath);
      return true;
    }
    if(settings.get_enum('mode') == 0){
      imgidx = imgidx + 1;
      if(imgidx >= imageNames.length){
        imgidx = 0;
      }
    }
    else if(settings.get_enum('mode') == 1){
      imgidx = Math.floor(Math.random() * imageNames.length);
    }
    setWallpaper(wallpaperPath + "/" + imageNames[imgidx]);      
  }
  catch(e)
  {
    saveExceptionLog(e);
  }
  return true;
}


function saveExceptionLog(e){
  let log_file = Gio.file_new_for_path( 
    home_dir + '/.local/var/log/WallpaperSwitcher.log' );

  let log_file_size =  log_file.query_info( 
    'standard::size', 0, null).get_size();
  
  if( log_file_size > logSize ){
    log_file.replace( null,false, 0, null ).close(null);
  }
  e = Date()+':\n' + e;
  let logOutStream = log_file.append_to( 1, null );
  logOutStream.write( e, null );
  logOutStream.close(null);

}

function init() {

}


function enable() {
  settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher');
  refreshTime = settings.get_double('frequency');
  oldrefreshTime = refreshTime;
  wallpaperPath = settings.get_string('wallpaper-path');
  timeout = Mainloop.timeout_add_seconds(refreshTime, changeWallpaper);
}

function disable() {
  Mainloop.source_remove(timeout);
  settings = null;
}


