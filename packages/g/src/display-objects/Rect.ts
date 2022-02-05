import { SHAPE } from '../types';
import type { BaseStyleProps, ParsedBaseStyleProps } from '../types';
import { DisplayObject } from './DisplayObject';
import type { DisplayObjectConfig } from '../dom';

export interface RectStyleProps extends BaseStyleProps {
  width: number;
  height: number;
  radius?: number;
}

export interface ParsedRectStyleProps extends ParsedBaseStyleProps {
  width: number;
  height: number;
  radius?: number;
}

export class Rect extends DisplayObject<RectStyleProps, ParsedRectStyleProps> {
  constructor({ style, ...rest }: DisplayObjectConfig<RectStyleProps>) {
    super({
      type: SHAPE.Rect,
      style: {
        width: 0,
        height: 0,
        ...style,
      },
      ...rest,
    });
  }
}