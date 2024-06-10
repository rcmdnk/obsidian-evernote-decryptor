import { Plugin, Notice, Editor, Menu } from 'obsidian';
import { evernoteDecryptor } from './EvernoteDecryptorPlugin';
import { PasswordModal  } from './PasswordModal';
import { DecryptedTextModal  } from './DecryptedTextModal';
import { makeSecretButton, decryptText  } from './CryptoUtils';

export default class EvernoteDecryptorPlugin extends Plugin {
  onload() {
    this.addCommand({
      id: 'decrypt-evernote-encrypted-data',
      name: 'Decrypt Evernote encrypted data',
      editorCallback: (editor: Editor) => this.evernoteDecrypt(editor),
    });

    this.addCommand({
      id: 'format-evernote-secret',
      name: 'Format Evernote secret',
      editorCallback: (editor: Editor) => this.formatEvernoteSecret(editor),
    });

    this.registerEvent(this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
      menu.addItem(item => {
        item.setTitle('Decrypt Evernote encrypted data')
          .onClick(() => this.evernoteDecrypt(editor));
      });
      menu.addItem(item => {
        item.setTitle('Format Evernote secret')
          .onClick(() => this.formatEvernoteSecret(editor));
      });
    }));

    this.registerMarkdownPostProcessor((el, ctx) => {
      const codeBlocks = el.querySelectorAll('code');
      codeBlocks.forEach((codeBlock) => {
        if (codeBlock.textContent.startsWith('evernote_secret ')) {
          const encryptedText = codeBlock.textContent;
          codeBlock.style.display = 'none';

          const button = makeSecretButton(this.app, encryptedText);
          codeBlock.parentElement.insertBefore(button, codeBlock);
        }
      });
    });

    this.registerEditorExtension(evernoteDecryptor(this.app));

    console.log('EvernoteDecryptor plugin loaded');
  }

  evernoteDecrypt(editor: Editor): void {
    const modal = new PasswordModal(this.app, password => {
      if (password.trim() === '') {
        new Notice('⚠️  Please enter a password.', 10000);
        return;
      }

      try {
        const selectedText = editor.getSelection();
        const decryptedText = decryptText(selectedText, password);
        const decryptedTextModal = new DecryptedTextModal(this.app, decryptedText);
        decryptedTextModal.open();
      } catch (error) {
        new Notice('❌ Failed to decrypt.', 10000);
        new Notice(error.message, 10000);
      }
    });

    modal.open();
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
