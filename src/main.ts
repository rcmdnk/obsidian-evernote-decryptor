import { Plugin, Editor, Menu } from 'obsidian';
import { makeSecretButton, editorDecrypt  } from './CryptoUtils';
import { makeViewPlugin  } from './ViewPlugin';

const PREFIX = 'evernote_secret ';
const ID_PREFIX = 'evernote-dectyptor-';
const DECRYPT_NAME = 'Decrypt Evernote encrypted data';
const FORMAT_NAME = 'Format Evernote secret';

export default class EvernoteDecryptorPlugin extends Plugin {
  onload() {
    this.addCommand({
      id: `${ID_PREFIX}decrypt`,
      name: DECRYPT_NAME,
      editorCallback: (editor: Editor) => editorDecrypt(this.app, editor),
    });

    this.addCommand({
      id: `${ID_PREFIX}format`,
      name: FORMAT_NAME,
      editorCallback: (editor: Editor) => this.formatEvernoteSecret(editor),
    });

    this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
      menu.addItem(item => {
        item.setTitle(DECRYPT_NAME)
          .onClick(() => editorDecrypt(this.app, editor));
      });
      menu.addItem(item => {
        item.setTitle(FORMAT_NAME)
          .onClick(() => this.formatEvernoteSecret(editor));
      });
    }));

    this.registerMarkdownPostProcessor((el, ctx) => {
      const codeBlocks = el.querySelectorAll('code');
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.textContent.startsWith(PREFIX)) {
          const encryptedText = codeBlock.textContent.slice(PREFIX.length);
          codeBlock.style.display = 'none';

          const button = makeSecretButton(this.app, encryptedText);
          codeBlock.parentElement.insertBefore(button, codeBlock);
        }
      });
    });

    this.registerEditorExtension(makeViewPlugin(this.app, PREFIX));

    console.log('EvernoteDecryptor plugin loaded');
  }

  formatEvernoteSecret(editor: Editor): void {
    const selectedText = editor.getSelection();
    const formattedText = `\`evernote_secret ${selectedText}\``;
    editor.replaceSelection(formattedText);
  }

  onunload() {
    console.log('EvernoteDecryptor plugin unloaded');
  }
}
