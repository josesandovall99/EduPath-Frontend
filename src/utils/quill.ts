let quillPromise: Promise<any> | null = null;
let quillConfigured = false;

export const sharedQuillToolbar = [
  [{ font: ['Algerian', 'Roboto', 'Monospace'] }, { size: ['12px', '14px', '16px', '18px', '20px', '24px'] }],
  [{ header: 2 }, { header: 3 }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link']
];

export const createQuillModules = () => ({
  toolbar: {
    container: sharedQuillToolbar,
    handlers: {
      link(this: any, value: boolean) {
        if (!value) {
          this.quill.format('link', false);
          return;
        }

        const range = this.quill.getSelection(true);
        if (!range) {
          return;
        }

        const selectedText = this.quill.getText(range.index, range.length).trim();
        const currentLink = this.quill.getFormat(range).link;
        const href = window.prompt('Ingrese la URL del enlace', typeof currentLink === 'string' ? currentLink : 'https://');

        if (!href) {
          return;
        }

        const normalizedHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
        this.quill.format('link', normalizedHref, 'user');

        if (!selectedText) {
          this.quill.insertText(range.index, normalizedHref, 'link', normalizedHref, 'user');
          this.quill.setSelection(range.index + normalizedHref.length, 0, 'user');
        }
      }
    }
  }
});

export const loadQuill = async () => {
  if (!quillPromise) {
    quillPromise = import('quill').then((module) => module.default);
  }

  const Quill = await quillPromise;

  if (!quillConfigured) {
    try {
      const SizeStyle = Quill.import('attributors/style/size');
      SizeStyle.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
      Quill.register(SizeStyle, true);

      const FontStyle = Quill.import('attributors/style/font');
      FontStyle.whitelist = ['Algerian', 'Roboto', 'Monospace'];
      Quill.register(FontStyle, true);
    } catch (err) {
      console.warn('Quill format registration failed', err);
    }

    quillConfigured = true;
  }

  return Quill;
};