import { EditorView, WidgetType } from '@codemirror/view';
import { makeSecretButton } from './CryptoUtils';


export class SecretButtonWidget extends WidgetType {
  constructor(public app: App, public encryptedText: string) {
    super();
  }

  toDOM(view: EditorView) {
    return makeSecretButton(this.app, this.encryptedText);
  }
}
