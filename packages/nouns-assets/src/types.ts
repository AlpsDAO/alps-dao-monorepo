export interface AlpSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

export interface EncodedImage {
  filename: string;
  data: string;
}

export interface AlpData {
  parts: EncodedImage[];
  background: string;
}
