import { Plugin, Menu, Editor } from 'obsidian';
import { SettingTab } from './settings/SettingsTab';
import { makeViewPlugin, makeSecretButton, showDecryptedText } from './utils/editorUtils';
import { encryptWrapper, decryptWrapper } from './utils/cryptoUtils';

export const PLUGIN_NAME = 'Evernote Decryptor';
const PREFIX = 'evernote_secret ';
const BUTTON_TEXT = 'Evernote Secret';
const BUTTON_CLASS = 'evernote-secret-button';
const ID_PREFIX = 'evernote-dectyptor-';
const DECRYPT_NAME = 'Decrypt Evernote encrypted data';
const DECRYPT_REPLACE_NAME = 'Decrypt Evernote encrypted data and replace';
const ENCRYPT_NAME = 'Encrypt data as Evernote secret';
const FORMAT_NAME = 'Format Evernote secret';

interface Settings {
  showEditorMenu: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  showEditorMenu: true,
};

export default class EvernoteDecryptorPlugin extends Plugin {
  settings: Settings;
  private contextMenuListener: (menu: Menu, editor: Editor) => void;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));

    this.addCommand({
      id: `${ID_PREFIX}decrypt`,
      name: DECRYPT_NAME,
      editorCallback: (editor: Editor) => this.editorDecrypt(editor),
    });
    this.addCommand({
      id: `${ID_PREFIX}decrypt-replace`,
      name: DECRYPT_REPLACE_NAME,
      editorCallback: (editor: Editor) => this.decryptReplace(editor),
    });
    this.addCommand({
      id: `${ID_PREFIX}encrypt`,
      name: ENCRYPT_NAME,
      editorCallback: (editor: Editor) => this.makeSecret(editor),
    });
    this.addCommand({
      id: `${ID_PREFIX}format`,
      name: FORMAT_NAME,
      editorCallback: (editor: Editor) => this.formatSecret(editor),
    });

    this.registerMarkdownPostProcessor((el, _) => {
      const codeBlocks = el.querySelectorAll('code');
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.parentElement === null) return;
        if (codeBlock.textContent === null) return;
        if (codeBlock.textContent.startsWith(PREFIX)) {
          const encryptedText = codeBlock.textContent.slice(PREFIX.length);
          codeBlock.style.display = 'none';

          const button = makeSecretButton(this.app, encryptedText, BUTTON_TEXT, BUTTON_CLASS);
          codeBlock.parentElement.insertBefore(button, codeBlock);
        }
      });
    });

    this.registerEditorExtension(makeViewPlugin(this.app, PREFIX, BUTTON_TEXT, BUTTON_CLASS));

    this.updateContextMenu();

    console.log(`${PLUGIN_NAME} loaded`);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  updateContextMenu(): void {
    if (this.contextMenuListener) {
      this.app.workspace.off('editor-menu', this.contextMenuListener);
    }
    this.contextMenuListener = (menu: Menu, editor: Editor) => {
      if (this.settings.showEditorMenu) {
        menu.addItem(item => {
          item.setTitle(DECRYPT_NAME)
            .onClick(() => this.editorDecrypt(editor));
        });
        menu.addItem(item => {
          item.setTitle(DECRYPT_REPLACE_NAME)
            .onClick(() => this.decryptReplace(editor));
        });
        menu.addItem(item => {
          item.setTitle(ENCRYPT_NAME)
            .onClick(() => this.makeSecret(editor));
        });
        menu.addItem(item => {
          item.setTitle(FORMAT_NAME)
            .onClick(() => this.formatSecret(editor));
        });
      }
    };
    this.registerEvent(this.app.workspace.on('editor-menu', this.contextMenuListener));
  }

  editorDecrypt(editor: Editor): void {
    const selectedText = editor.getSelection();
    showDecryptedText(this.app, selectedText);
  }

  async decryptReplace(editor: Editor): Promise<void> {
    let selectedText = editor.getSelection().trim().replace(/^`+|`+$/g, '');
    if (selectedText.startsWith(PREFIX)) {
      selectedText = selectedText.slice(PREFIX.length);
    }
    const decryptedText = await decryptWrapper(this.app, selectedText);
    if (decryptedText !== null) {
      editor.replaceSelection(decryptedText);
    }
  }

  async makeSecret(editor: Editor): Promise<void> {
    const selectedText = editor.getSelection();
    const encryptedText = await encryptWrapper(this.app, selectedText);
    if (encryptedText !== null) {
      const formattedText = `\`${PREFIX}${encryptedText}\``;
      editor.replaceSelection(formattedText);
    }
  }

  formatSecret(editor: Editor): void {
    const selectedText = editor.getSelection();
    const formattedText = `\`${PREFIX}${selectedText}\``;
    editor.replaceSelection(formattedText);
  }

  onunload(): void {
    console.log(`${PLUGIN_NAME} unloaded`);
  }
}
