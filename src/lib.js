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

function getCurrentWallpaperUri(){
  let backgroundSetting = new Gio.Settings({schema: "org.gnome.desktop.background"});
  if(getCurrentColorScheme() == 1){
    return decodeURI(backgroundSetting.get_string("picture-uri-dark").substr(7,));
  }
  else{
    return decodeURI(backgroundSetting.get_string("picture-uri").substr(7,));
  }
  
}

function getOtherExtensionSettings(schema,otherExtension){
    if (!otherExtension)
        throw new Error('getSettings() can only be called from extensions');

    schema ||= otherExtension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // Expect USER extensions to have a schemas/ subfolder, otherwise assume a
    // SYSTEM extension that has been installed in the same prefix as the shell
    let schemaDir = otherExtension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null)) {
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                 GioSSS.get_default(),
                                                 false);
    } else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error(`Schema ${schema} could not be found for extension ${extension.metadata.uuid}. Please check your installation`);

    return new Gio.Settings({ settings_schema: schemaObj });
}

function getWallpaperOverlaySetting(){
  try{
    let otherExtension = imports.ui.main.extensionManager.lookup("WallpaperOverlay@Rishu");
    //Enabled is 1 Ref:  https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/misc/extensionUtils.js#L21-32
    if(otherExtension.state != 1){
        return null;
    }
    else{
      let wallpaperOverlaySetting = getOtherExtensionSettings(
        'org.gnome.shell.extensions.WallpaperOverlay',
        otherExtension);
      return wallpaperOverlaySetting;
    }
  }
  catch{}
  return null;
}

function getWallpaperWithOverlaySetterFunction(wallpaperOverlaySetting){
  return (path) => {
    wallpaperOverlaySetting.set_string("picture-uri",path);
  }
}

function getWallpaperSetterFunction(){
  return (path) =>{
    if( Gio.file_new_for_path(path).query_exists(null)){
      path = "file://" + path;
      let colorScheme = getCurrentColorScheme();
      var msg,response;
      if(colorScheme == 0){
        _modifyExternalSetting("org.gnome.desktop.background", "picture-uri", path);
      }
      else{
        _modifyExternalSetting("org.gnome.desktop.background", "picture-uri-dark", path);
      }
    }
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
      setErrorMsg("NIF:--\n"+wallpaperFolderPath); // No Images Found
    }
    return wallpaperPaths;
  }
  catch(e){
    setErrorMsg("PNE:--\n"+wallpaperFolderPath); // Path Not Exists
    return [];
  }
}

function getFrequency(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_int('frequency');
}
function getWallpaperPath(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_string('wallpaper-path');
}
function getSwitchingMode(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_int('switching-mode');
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
function getErrorMsg(){
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').get_string('error-msg');
}
function setErrorMsg(val){
  let dropErr = ["UWO",""]
  if(!dropErr.includes(val)) saveExceptionLog("DisplayLog: "+String(val));
  return ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher').set_string('error-msg',String(val));
}
