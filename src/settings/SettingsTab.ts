import { App, PluginSettingTab, Setting } from 'obsidian';
import { PLUGIN_NAME } from '../constants/plugin';
import EvernoteDecryptorPlugin from '../main';

export class SettingTab extends PluginSettingTab {
	plugin: EvernoteDecryptorPlugin;

	constructor(app: App, plugin: EvernoteDecryptorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h1', { text: `${PLUGIN_NAME} Settings` });

		new Setting(containerEl)
			.setName('Show Editor Context Menu Item')
			.setDesc('Toggle the display of the editor context menu item.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showEditorMenu)
				.onChange(async (value) => {
					this.plugin.settings.showEditorMenu = value;
					await this.plugin.saveSettings();
					this.plugin.updateContextMenu();
				}));
	}
}
