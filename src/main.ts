import { Plugin, Editor, Menu } from 'obsidian';
import { encryptWrapper, decryptWrapper, editorDecrypt } from './CryptoUtils';
import { makeViewPlugin  } from './ViewPlugin';
import { makeSecretButton  } from './SecretButtonWidget';

const PREFIX = 'evernote_secret ';
const BUTTON_TEXT = 'Evernote Secret';
const BUTTON_CLASS = 'evernote-secret-button';

const ID_PREFIX = 'evernote-dectyptor-';
const DECRYPT_NAME = 'Decrypt Evernote encrypted data';
const DECRYPT_REPLACE_NAME = 'Decrypt Evernote encrypted data and replace';
const ENCRYPT_NAME = 'Encrypt data as Evernote secret';
const FORMAT_NAME = 'Format Evernote secret';

export default class EvernoteDecryptorPlugin extends Plugin {
  onload(): void {
    this.addCommand({
      id: `${ID_PREFIX}decrypt`,
      name: DECRYPT_NAME,
      editorCallback: (editor: Editor) => editorDecrypt(this.app, editor),
    });
    this.addCommand({
      id: `${ID_PREFIX}decrypt-replace`,
      name: DECRYPT_NAME,
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

    this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
      menu.addItem(item => {
        item.setTitle(DECRYPT_NAME)
          .onClick(() => editorDecrypt(this.app, editor));
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
    }));

    this.registerMarkdownPostProcessor((el, _) => {
      const codeBlocks = el.querySelectorAll('code');
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.parentElement === null) {
            return;
        }
        if (codeBlock.textContent === null) {
            return;
        }
        if (codeBlock.textContent.startsWith(PREFIX)) {
          const encryptedText = codeBlock.textContent.slice(PREFIX.length);
          codeBlock.style.display = 'none';

          const button = makeSecretButton(this.app, encryptedText, BUTTON_TEXT, BUTTON_CLASS);
          codeBlock.parentElement.insertBefore(button, codeBlock);
        }
      });
    });

    this.registerEditorExtension(makeViewPlugin(this.app, PREFIX, BUTTON_TEXT, BUTTON_CLASS));

    console.log(`${this.constructor.name} loaded`);
  }

  async makeSecret(editor: Editor): Promise<void> {
    const selectedText = editor.getSelection();
    const encryptedText = await encryptWrapper(this.app, selectedText);
    if (encryptedText === null) {
      return;
    }
    const formattedText = `\`${PREFIX}${encryptedText}\``;
    editor.replaceSelection(formattedText);
  }

  async decryptReplace(editor: Editor): Promise<void> {
    let selectedText = editor.getSelection();
    selectedText = selectedText.trim();
    selectedText = selectedText.replace(/^`+|`+$/g, '');
    if (selectedText.startsWith(PREFIX)) {
      selectedText = selectedText.slice(PREFIX.length);
    }
    const decryptedText = await decryptWrapper(this.app, selectedText);
    if (decryptedText === null) {
      return;
    }
    editor.replaceSelection(decryptedText);
  }

  formatSecret(editor: Editor): void {
    const selectedText = editor.getSelection();
    const formattedText = `\`${PREFIX}${selectedText}\``;
    editor.replaceSelection(formattedText);
  }

  onunload(): void {
    console.log(`${this.constructor.name} unloaded`);
  }
}
