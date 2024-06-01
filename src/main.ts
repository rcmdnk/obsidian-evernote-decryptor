import { Plugin, Notice, Editor, Menu } from 'obsidian';
import { PasswordModal } from 'PasswordModal';
import { decryptText } from 'CryptoUtils';

export default class EvernoteDecryptorPlugin extends Plugin {
    onload() {
        this.addCommand({
            id: 'decrypt-evernote-encrypted-data',
            name: 'Decrypt Evernote encrypted data',
            editorCallback: (editor: Editor) => this.evernoteDecrypt(editor)
        });

        this.addCommand({
            id: 'format-evernote-secret',
            name: 'Format Evernote secret',
            editorCallback: (editor: Editor) => this.formatEvernoteSecret(editor)
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
                if (codeBlock.textContent.startsWith('evernote_secret')) {
                    const secretText = codeBlock.textContent;
                    codeBlock.style.display = 'none';

                    const button = document.createElement('button');
                    button.textContent = 'Show Secret';
                    button.classList.add('evernote-secret-button');
                    button.onclick = () => {
                        alert(`Secret: ${secretText}`);
                    };
                    codeBlock.parentElement.insertBefore(button, codeBlock);

                }
            });
        });

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
                editor.replaceSelection(decryptedText);
            } catch (error) {
                new Notice('❌ Failed to decrypt.', 10000);
                new Notice(error);
            }
        });

        modal.open();
    }

    formatEvernoteSecret(editor: Editor): void {
        const selectedText = editor.getSelection();
        const formattedText = `\`evernote_secret ${selectedText}\``;
        editor.replaceSelection(formattedText);
    }
}
