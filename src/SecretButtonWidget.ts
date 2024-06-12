import { App } from 'obsidian';
import { EditorView, WidgetType } from '@codemirror/view';
import { onclickDecrypt } from './CryptoUtils';


export function makeSecretButton(app: App, encryptedText: string, button_text: string, button_class: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = button_text; // 'Evernote Secret';
  button.classList.add(button_class); //('evernote-secret-button');
  button.onclick = (event: MouseEvent) => onclickDecrypt(app, encryptedText, event);
  return button;
}

export class SecretButtonWidget extends WidgetType {
  constructor(public app: App, public encryptedText: string, public button_text: string, public button_class: string) {
    super();
  }

  toDOM(_: EditorView): HTMLElement {
    return makeSecretButton(this.app, this.encryptedText, this.button_text, this.button_class);
  }
}
