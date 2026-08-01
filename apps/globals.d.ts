declare global {
  interface Window {
    __CORE3_USER__?: any;
    __CORE3_API_BASE__?: string;
  }

  const Bun: {
    file(path: string): any;
    YAML: {
      parse(text: string): any;
    };
    password: {
      hash(password: string): Promise<string>;
      verify(password: string, hash: string): Promise<boolean>;
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
