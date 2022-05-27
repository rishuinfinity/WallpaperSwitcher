/*
* Name: Wallpaper Switcher
* Description: Extension to automatically Change wallpaper after a given interval
* Author: Rishu Raj
*/
////////////////////////////////////////////////////////////
//Const Variables
const Gio            = imports.gi.Gio;
const GLib           = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const homeDir       = GLib.get_home_dir();

////////////////////////////////////////////////////////////
// Function Implementations
function _modifyExternalSetting(schemaPath, settingId, settingValue){
  // This function assumes that setting-value is always string
  let setting = new Gio.Settings({schema: schemaPath});
  if (setting.is_writable(settingId)){
    let response = setting.set_string(settingId, settingValue);
    if (response){
      Gio.Settings.sync();
      return [settingId + " set \n",1];
    }
    saveExceptionLog(schemaPath+"."+settingId +" unmodifiable");
    return [settingId +" unmodifiable \n",0];
  }
  saveExceptionLog(schemaPath+"."+settingId +" unwritable");
  return [settingId +" unwritable \n",0];
}

function getCurrentColorScheme(){
  let colorSchemeSetting = new Gio.Settings({schema: "org.gnome.desktop.interface"});
  let colorScheme = colorSchemeSetting.get_enum("color-scheme");
  return (colorScheme == 1)?1:0; //1 means dark
}

function _setWallpaper(path){
  try{
    if( Gio.file_new_for_path(path).query_exists(null)){
      path = "file://" + path;
      let colorScheme = getCurrentColorScheme();
      var msg,response;
      if(colorScheme == 0){
        [msg,response] = _modifyExternalSetting("org.gnome.desktop.background", "picture-uri", path);
        if (response == 0) return [msg,0];
      }
      else{
        [msg,response] = _modifyExternalSetting("org.gnome.desktop.background", "picture-uri-dark", path);
        if (response == 0) return [msg,0];
      }
      return ["Wallpaper Set",1];
    }
  }
  catch(e){
    saveExceptionLog(e);
  }
}


function saveExceptionLog(e){
  try{
    let logSize = 8000; // about 8k
    let log_file = Gio.file_new_for_path( homeDir + '/.local/var/log/WallpaperSwitcher.log' );
    try{log_file.create(Gio.FileCreateFlags.NONE, null);} catch{}
    let log_file_size =  log_file.query_info( 
        'standard::size', 0, null).get_size();
    if( log_file_size > logSize ){
        log_file.replace( null,false, 0, null ).close(null);
    }
    let date = new Date();
    e = [
      String(date.getDate()    ).padStart(2),"/",
      String(date.getMonth()   ).padStart(2),"/",
      String(date.getFullYear()).padStart(4),"-",
      String(date.getHours()   ).padStart(2),":",
      String(date.getMinutes() ).padStart(2),":",
      String(date.getSeconds() ).padStart(2),"~",
      ' ' + e + "\n"];
    e = e.join("");
    let logOutStream = log_file.append_to( 1, null );
    logOutStream.write( e, null );
    logOutStream.close(null);
  }
  catch(e){
    log("WallpaperSwitcher: (Logger Error)");
    log(e);
  }
}

function getWallpaperList(wallpaperFolderPath = getWallpaperPath()){
  try{
    if(wallpaperFolderPath[wallpaperFolderPath.length-1] != '/') wallpaperFolderPath = wallpaperFolderPath + "/";
    let wallpaperFolder = Gio.file_new_for_path(wallpaperFolderPath);
    let enumerator = wallpaperFolder.enumerate_children("standard::name, standard::type",Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    let wallpaperPaths = [];
    let child;
    while ((child = enumerator.next_file(null))){
      // check if it is a file
      if( child.get_file_type() == Gio.FileType.REGULAR)
      {
        // check hidden
        if(!child.get_is_hidden()){
          let ext = child.get_name().split(".").pop();
          if(["png","jpg","jpeg"].includes(ext))
          {
            wallpaperPaths.push(wallpaperFolderPath + child.get_name());
          }
        }
      }
    }
    if(wallpaperPaths.length == 0){
      setErrorMsg("NIF:--\n"+wallpaperFolderPath);
    }
    return wallpaperPaths;
  }
  catch(e){
    setErrorMsg("PNE:--\n"+wallpaperFolderPath);
    return [];
  }
}

function getFrequency(){
  saveExceptionLog(ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_int('frequency'));
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_int('frequency');
}
function getWallpaperPath(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_string('wallpaper-path');
}
function getSwitchingMode(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_int('switching-mode');
}
function getWallpaperOverlaySupport(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_boolean('wallpaper-overlay-support');
}
function setFrequency(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').set_int('frequency',val);
}
function setWallpaperPath(val){
  if(val[0] == "~"){
    val = homeDir + val.substr(1,)
  }
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').set_string('wallpaper-path',val);
}
function setSwitchingMode(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').set_int('switching-mode',val);
}
function setWallpaperOverlaySupport(val){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').set_boolean('wallpaper-overlay-support',val);
}
function getErrorMsg(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_string('error-msg');
}
function setErrorMsg(val){
  let dropErr = ["WC",""]
  if(!dropErr.includes(val.split(":--")[0])) saveExceptionLog("DisplayLog: "+String(val));
  saveExceptionLog("DisplayLog: "+String(val));
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').set_string('error-msg',String(val));
}
