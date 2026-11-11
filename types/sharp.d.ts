// Tipos mínimos do sharp usados em app/lib/upload-validation.ts.
// Mantém o tsc estável mesmo quando o pacote ainda não foi instalado no ambiente.
declare module 'sharp' {
  interface SharpOptions {
    limitInputPixels?: number | boolean;
    failOn?: 'none' | 'truncated' | 'error' | 'warning';
  }
  interface SharpMetadata {
    format?: string;
    width?: number;
    height?: number;
  }
  interface SharpInstance {
    metadata(): Promise<SharpMetadata>;
    png(): SharpInstance;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: Buffer, options?: SharpOptions): SharpInstance;
  export default sharp;
}
