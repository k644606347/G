import type { DisplayObject } from '../DisplayObject';
import type { vec2, vec3 } from 'gl-matrix';
import { convertPercentUnit, parseLengthOrPercent } from './dimension';
import { isNil } from '@antv/util';

/**
 * @see /zh/docs/api/animation#%E8%B7%AF%E5%BE%84%E5%8A%A8%E7%94%BB
 */
export function updateOrigin(oldValue: vec2 | vec3, value: vec2 | vec3, object: DisplayObject) {
  object.setOrigin(value[0], value[1], value[2]);
}

/**
 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/transform-origin
 * eg. 'center' 'top left' '50px 50px'
 */
export function updateTransformOrigin(oldValue: string, value: string, object: DisplayObject) {
  let values = value.split(' ');
  let originX: number | undefined;
  let originY: number | undefined;

  if (values.length === 1) {
    if (values[0] === 'top' || values[0] === 'bottom') {
      // 'top' -> 'center top'
      values[1] = values[0];
      values[0] = 'center';
    } else {
      // '50px' -> '50px center'
      values[1] = 'center';
    }
  }

  if (values.length === 2) {
    // eg. center bottom
    const parsedX = parseLengthOrPercent(convertKeyword2Percent(values[0]));
    const parsedY = parseLengthOrPercent(convertKeyword2Percent(values[1]));

    if (parsedX) {
      originX = convertPercentUnit(parsedX, 0, object);
    }
    if (parsedY) {
      originY = convertPercentUnit(parsedY, 1, object);
    }
  }

  if (!isNil(originX) && !isNil(originY)) {
    // relative to local bounds
    const localBounds = object.getLocalBounds();
    if (localBounds) {
      const [minX, minY] = localBounds.getMin();
      object.setOrigin(originX! + minX, originY! + minY);
    }
  }
}

function convertKeyword2Percent(keyword: string) {
  if (keyword === 'center') {
    return '50%';
  } else if (keyword === 'left' || keyword === 'top') {
    return '0';
  } else if (keyword === 'right' || keyword === 'bottom') {
    return '100%';
  }
  return keyword;
}
