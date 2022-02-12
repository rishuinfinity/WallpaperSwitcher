'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
// const Me = ExtensionUtils.getCurrentExtension();

let home_dir = imports.gi.GLib.get_home_dir();

function init() {
}

function buildPrefsWidget() {

    // Copy the same GSettings code from `extension.js`
    this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.WallpaperSwitcher');

    // Create a parent widget that we'll return from this function
    let prefsWidget = new Gtk.Grid({
        // margin: 18,
        margin_start: 40,
        margin_end: 40,  
        margin_top: 40,
        margin_bottom: 40,
        column_spacing: 20,
        row_spacing: 12,
        visible: true
    });


///////////////////////////  Reload Notice

    let reloadLabel = new Gtk.Label({
        label: "If changes dont apply, reload the extension.",
        halign: Gtk.Align.CENTER,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(reloadLabel, 0, 1, 2, 1);

///////////////////////////  2nd input
    // Create a label & switch for `frequency`
    let frequencyLabel = new Gtk.Label({
        label: '<b>Wallpaper Timeout:</b> (in seconds)',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(frequencyLabel, 0, 2, 1, 1);

    let frequencyentry = new Gtk.SpinButton({
        value: this.settings.get_double('frequency'),
        digits: 1,
		adjustment: new Gtk.Adjustment({
			lower: 1,
            upper:100000,
			step_increment: 1,
			page_increment: 10
		}),
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    prefsWidget.attach(frequencyentry, 1, 2, 1, 1);

    // Bind the entry to the `frequency` key
    this.settings.bind(
        'frequency',
        frequencyentry,
        'value',
        Gio.SettingsBindFlags.DEFAULT
    );

///////////////////////////  3rd input
    // Create a label & switch for `wallpaper path`
    let pathLabel = new Gtk.Label({
        label: '<b>Wallpaper Folder Path:</b> (absolute)',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(pathLabel, 0, 3, 1, 1);

    let pathentry = new Gtk.Entry({
        text: this.settings.get_string('wallpaper-path'),
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    prefsWidget.attach(pathentry, 1, 3, 1, 1);

    // Bind the entry to the `path` key
    this.settings.bind(
        'wallpaper-path',
        pathentry,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );


///////////////////////////  Lock Screen Switch
    // Create a label & switch for `change lock screen`
    let changeLockScreenLabel = new Gtk.Label({
        label: '<b>Change lock screen:</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(changeLockScreenLabel, 0, 4, 1, 1);

    let changeLockScreenToggle = new Gtk.Switch({
        active: this.settings.get_boolean ('change-lock-screen'),
        halign: Gtk.Align.END,
        hexpand: true,
        visible: true
    });
    prefsWidget.attach(changeLockScreenToggle, 1, 4, 1, 1);

    // Bind the switch to the `show-indicator` key
    this.settings.bind(
        'change-lock-screen',
        changeLockScreenToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );

///////////////////////////  Mode Switch
    // Create a label & selector for `change mode`
    let changeModeLabel = new Gtk.Label({
        label: '<b>Switching Mode:</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(changeModeLabel, 0, 5, 1, 1);

    let changeModeToggle = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true
    });
    this.changeModeToggle = new Gtk.ComboBoxText();
    let options = ["Sequential", "Random"]
    for (let item of options)
        changeModeToggle.append_text(item);

    changeModeToggle.set_active(this.settings.get_enum("mode") || 0);
    changeModeToggle.connect('changed', combobox => {
        this.settings.set_enum("mode", combobox.get_active());
    });
    changeModeToggle.set_active(this.settings.get_enum("mode") || 0);
    prefsWidget.attach(changeModeToggle, 1, 5, 1, 1);


///////////////////////////  Reset Button

    let resetButton = new Gtk.Button({
        label: "Reset Settings",
        visible: true
    });
    resetButton.connect('clicked', () => {
        this.settings.set_string('wallpaper-path',home_dir + "/Pictures/Wallpapers");
        this.settings.set_double('frequency',60);
        this.settings.set_boolean('change-lock-screen',false);
    });
    prefsWidget.attach(resetButton, 0, 6, 2, 1);

    // Return our widget which will be added to the window
    return prefsWidget;
}