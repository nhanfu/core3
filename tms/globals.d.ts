declare global {
  interface Window {
    __CORE3_USER__?: Record<string, unknown> | null;
    __CORE3_API_BASE__?: string;
  }

  const Bun: {
    file(path: string): {
      exists(): Promise<boolean>;
      text(): Promise<string>;
    };
    YAML: {
      parse(text: string): any;
    };
    Transpiler: new (options: { loader: 'ts' | 'js' }) => {
      transformSync(source: string): string;
    };
  };

  interface ImportMeta {
    dir: string;
  }
}

export {};
