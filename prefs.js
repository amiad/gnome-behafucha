import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

export default class GnomeBehafuchaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.gnome-behafucha');
        
        // Define the stability note once to avoid duplicate translations
        const stabilityNote = _('Note: Shortcuts without "Shift" are more stable.');

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: _('Settings') });
        
        const row = new Adw.ActionRow({
            title: _('Keyboard Shortcut'),
            subtitle: `${_('Shortcut to convert text.')} ${stabilityNote}`,
            activatable: true
        });

        const shortcutLabel = new Gtk.ShortcutLabel({
            disabled_text: _('Not Set'),
            valign: Gtk.Align.CENTER
        });

        const updateLabel = () => {
            const shortcut = settings.get_strv('convert-text-shortcut');
            shortcutLabel.accelerator = (shortcut && shortcut.length > 0) ? shortcut[0] : '';
        };

        updateLabel();
        settings.connect('changed::convert-text-shortcut', updateLabel);

        const startEditing = () => {
            const editor = new Adw.Window({
                modal: true,
                transient_for: window,
                width_request: 450,
                height_request: 250,
                title: _('Set Shortcut')
            });

            const view = new Adw.StatusPage({
                title: _('Recording...'),
                description: `${_('Press full combination (e.g., Super+Z).')}\n${stabilityNote}\n${_('Esc to cancel')}`,
                icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic'
            });

            const eventController = new Gtk.EventControllerKey();
            editor.add_controller(eventController);

            eventController.connect('key-pressed', (controller, keyval, keycode, state) => {
                if (keyval === Gdk.KEY_Escape) {
                    editor.close();
                    return true;
                }

                let mask = state & Gtk.accelerator_get_default_mod_mask();
                
                const isAlt = (state & Gdk.ModifierType.ALT_MASK) || (state & Gdk.ModifierType.MOD1_MASK);
                const isCtrl = (state & Gdk.ModifierType.CONTROL_MASK);
                const isShift = (state & Gdk.ModifierType.SHIFT_MASK);
                const isSuper = (state & Gdk.ModifierType.SUPER_MASK) || (state & Gdk.ModifierType.META_MASK);

                let isModifierKey = (
                    keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
                    keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
                    keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
                    keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R
                );

                if (!isModifierKey && mask !== 0) {
                    let res = '';
                    if (isCtrl) res += '<Control>';
                    if (isAlt) res += '<Alt>';
                    if (isShift) res += '<Shift>';
                    if (isSuper) res += '<Super>';
                    
                    let keyName = Gtk.accelerator_name(keyval, 0);
                    res += keyName;

                    if (res) {
                        settings.set_strv('convert-text-shortcut', [res]);
                        editor.close();
                    }
                }
                return true; 
            });

            editor.set_content(view);
            editor.present();
        };

        const editButton = new Gtk.Button({
            icon_name: 'edit-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat']
        });

        editButton.connect('clicked', startEditing);
        row.connect('activated', startEditing);

        row.add_suffix(shortcutLabel);
        row.add_suffix(editButton);
        group.add(row);
        page.add(group);
        window.add(page);
    }
}