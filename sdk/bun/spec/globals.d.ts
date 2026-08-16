declare global {
  const Bun: {
    file(path: string): any;
    YAML: {
      parse(text: string): any;
    };
    Transpiler: new (options: { loader: 'ts' | 'js' }) => {
      transformSync(source: string): string;
    };
    serve(handler: any): any;
  };

  interface ImportMeta {
    dir: string;
  }
}

export {};
