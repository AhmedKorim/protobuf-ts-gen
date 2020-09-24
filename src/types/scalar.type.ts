import { PrimitiveType } from "./primitive-types.enum";

export type Scalar =
  | {
      [key: string]: ScalarValue;
    }
  | ScalarValue;
export type ScalarValue =
  | "object"
  | PrimitiveType
  | ObjectOf<PrimitiveType>
  | ObjectOf<"object">
  | string
  | ObjectOf<string>;
export type ObjectOf<T> = {
  [key: string]: T;
};
