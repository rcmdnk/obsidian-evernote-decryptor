import { App, editorLivePreviewField } from 'obsidian';
import { WidgetType, Decoration, DecorationSet, ViewPlugin, EditorView, ViewUpdate } from '@codemirror/view';
import { SyntaxNodeRef } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder  } from '@codemirror/state';
import { decryptWrapper } from './cryptoUtils';
import { DecryptedTextModal } from '../modals/DecryptedTextModal';


export async function showDecryptedText(app: App, encryptedText: string): Promise<void> {
  const decryptedText = await decryptWrapper(app, encryptedText);
  if (decryptedText !== null) {
    new DecryptedTextModal(app, decryptedText).open();
  }
}

export function makeSecretButton(app: App, encryptedText: string, buttonText: string, buttonClass: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = buttonText;
  button.classList.add(buttonClass);
  button.onclick = (event: MouseEvent) => {
    event.preventDefault();
    showDecryptedText(app, encryptedText);
  };
  return button;
}

class SecretButtonWidget extends WidgetType {
  constructor(public app: App, public encryptedText: string, public buttonText: string, public buttonClass: string) {
    super();
  }

  toDOM(_: EditorView): HTMLElement {
    return makeSecretButton(this.app, this.encryptedText, this.buttonText, this.buttonClass);
  }
}

export const makeViewPlugin = (app: App, prefix: string, buttonText: string, buttonClass: string) => ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.createDecorations(view);
  }

  update(update: ViewUpdate): void {
    if (!update.state.field(editorLivePreviewField)) {
      this.decorations = Decoration.none;
      return;
    }
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.createDecorations(update.view);
    }
  }

  private createDecorations(view: EditorView): DecorationSet {
    if (!view.state.field(editorLivePreviewField)) return Decoration.none;

    const builder = new RangeSetBuilder<Decoration>();
    const selection = view.state.selection;

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node: SyntaxNodeRef) {
          if (node.type.name.startsWith("inline-code")) {
            const value = view.state.doc.sliceString(node.from, node.to)
            if(value.startsWith(prefix)){
              if(!selection.ranges.some(range => range.from <= node.to + 1 && range.to >= node.from - 1)){
                const encryptedText = value.slice(prefix.length);
                builder.add(
                  node.from,
                  node.to,
                  Decoration.replace({
                    widget: new SecretButtonWidget(app, encryptedText, buttonText, buttonClass)
                  })
                );
              }
            }
          }
        },
      });
    }
    return builder.finish();
  }
}, {
  decorations: v => v.decorations,
});

