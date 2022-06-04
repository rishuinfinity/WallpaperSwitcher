/*
* Name: Wallpaper Switcher
* Description: Extension to automatically Change wallpaper after a given interval
* Author: Rishu Raj
*/
'use strict';

////////////////////////////////////////////////////////////
// Const Imports
const {Gtk,Adw,Gio,GLib,Gdk,GdkPixbuf}  = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me             = ExtensionUtils.getCurrentExtension();
const lib            = Me.imports.lib;


////////////////////////////////////////////////////////////
// Prefs.js default functions
function init(){
    const styleProvider = new Gtk.CssProvider();
    styleProvider.load_from_path(GLib.build_filenamev([Me.path, 'stylesheet.css']));
    Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), styleProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function fillPreferencesWindow(window) {
    window.set_default_size(530, 400);
    let builder = Gtk.Builder.new();
    // Global Variable for prefs window
    let mySetting = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher');
    builder.add_from_file(Me.path + '/prefs.ui');
    // Creating variables corresponding to objects
    let frequencyChanger = builder.get_object('frequency-changer');
    let switchingModeComboRow = builder.get_object("switching-mode-comborow");
    let wallpaperPathRow = builder.get_object("wallpaper-path-row");
    let wallpaperPathEntry = builder.get_object("wallpaper-path-entry");
    let showCurrentButton = builder.get_object("show-current");
    let resetButton = builder.get_object("reset-button");
    let errorGroup=builder.get_object("error-group");
    let errorRow = builder.get_object("error-row");
    let errorView= builder.get_object("error-view");

    //
    let dropErr = ["WC","NIF","PNE","Reset"];
    if(dropErr.includes(lib.getErrorMsg().split(":--")[0])) lib.setErrorMsg("");
    //

    //Adding bindings and connecting
    // Frequency Changer
    mySetting.bind(
        'frequency',
        frequencyChanger,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );
    // Switching Mode ComboRow
    switchingModeComboRow.connect("notify::selected-item", ()=>{
        lib.setSwitchingMode(switchingModeComboRow.selected);
    });
    switchingModeComboRow.selected = lib.getSwitchingMode();


    // WallpaperPathEntry
    function updatePathEntry(){
        let isValid = lib.getWallpaperList(wallpaperPathEntry.text).length;
        if(isValid > 0){
            wallpaperPathEntry.primary_icon_name="go-next-symbolic";
            wallpaperPathRow.subtitle = wallpaperPathEntry.text;
            wallpaperPathRow.expanded = false;
            lib.setWallpaperPath(wallpaperPathEntry.text);
            lib.setErrorMsg( "WC:--" + String(isValid));
        }
        else{
            wallpaperPathEntry.primary_icon_name="mail-mark-junk-symbolic";
        }
    }
    wallpaperPathRow.subtitle = lib.getWallpaperPath();
    wallpaperPathEntry.text = lib.getWallpaperPath();
    wallpaperPathEntry.primary_icon_name="go-next-symbolic";
    wallpaperPathEntry.connect("activate",() => {
        updatePathEntry();
    });
    wallpaperPathEntry.connect("icon-release",() => {
        updatePathEntry();
    });

    // Show current wallpaper in nautilus
    showCurrentButton.connect("clicked",()=>{
        let wallpaper = lib.getCurrentWallpaperUri();
        let command = "nautilus -s '"+wallpaper+"'";
        GLib.spawn_command_line_async(command);
    });
    // Reset Button
    resetButton.connect('clicked',()=>{
        lib.setFrequency(300);
        lib.setWallpaperPath("/usr/share/backgrounds");
        // would need to relook wallpaper path
        switchingModeComboRow.selected = 1;
        lib.setWallpaperOverlaySupport(false);
        lib.setErrorMsg("Reset")
    });

    // Error Row
    function showSimpleError(icon_name, title){
        let errorRowActionRow = errorRow.get_first_child().get_first_child().get_first_child();
        let errorRowSuffix = errorRowActionRow.get_first_child().get_last_child();
        errorGroup.visible = true;
        errorRow.enable_expansion=false;
        errorRow.expanded = false;
        errorRowActionRow.activatable = false;
        errorRowSuffix.visible = false;
        errorRow.title=title;
        errorRow.icon_name=icon_name;
    }
    function showComplexError(icon_name,title, description){
        let errorRowActionRow = errorRow.get_first_child().get_first_child().get_first_child();
        let errorRowSuffix = errorRowActionRow.get_first_child().get_last_child();
        errorGroup.visible = true;
        errorRow.enable_expansion=true;
        errorRow.expanded = false;
        errorRowActionRow.activatable = true;
        errorRowSuffix.visible = true;
        errorRow.title=title;
        errorRow.icon_name=icon_name;
        errorView.label=description;
    }
    function updateErrorShowStatus(){
        let errMsgs = lib.getErrorMsg().split(":--");
        if(errMsgs[0] == null){
            errMsgs.push("");
        }
        switch(errMsgs[0]){
            case "":
                // errorGroup.visible = false;
                showSimpleError(
                    "face-smile-symbolic",
                    "Thanks for using Wallpaper Switcher"
                );
                break;
            case "UWO":
                showSimpleError(
                    "face-smile-symbolic",
                    "Thanks for using Wallpaper Switcher and Wallpaper Overlay"
                );
                break;
            case "WC":
                showSimpleError(
                    "emblem-default-symbolic",
                    errMsgs[1] + " Wallpapers Collected"
                );
                break;
            case "NIF":
                showComplexError(
                    "dialog-warning-symbolic",
                    "No images found",
                    "No images found on "+errMsgs[1]
                );
                break;
            case "PNE":
                showComplexError(
                    "dialog-error-symbolic",
                    "Path Does not Exist",
                    "The path "+errMsgs[1] + " does not exist."
                );
                break;
            case "Reset":
                showSimpleError(
                    "emblem-default-symbolic",
                    "Settings have been reset"
                    );
                break;
            default:
                showComplexError("dialog-error-symbolic","Some Error Occured",String(errMsgs));
        }
    }

    updateErrorShowStatus();
    mySetting.connect("changed::error-msg", () => {
        updateErrorShowStatus();
    });
    let page = builder.get_object('prefs-page');
    window.add(page);
}
