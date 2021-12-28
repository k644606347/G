import { DisplayObjectConfig, PARSED_COLOR_TYPE, Tuple4Number } from '@antv/g';
import { Light, LightProps, fillVec4 } from '@antv/g-plugin-webgl-renderer';
import { vec3 } from 'gl-matrix';

export interface DirectionalLightProps extends LightProps {
  direction: vec3;
}

export class DirectionalLight extends Light {
  define = 'NUM_DIR_LIGHTS';
  order = 10;

  constructor({ style, ...rest }: DisplayObjectConfig<DirectionalLightProps> = {}) {
    super({
      style: {
        direction: vec3.fromValues(0, -1, 0),
        ...style,
      },
      ...rest,
    });
  }

  getUniformWordCount() {
    return 4 + 4;
  }

  uploadUBO(d: Float32Array, offs: number) {
    const { fill, direction, intensity } = this.parsedStyle;

    if (fill?.type === PARSED_COLOR_TYPE.Constant) {
      const fillColor = fill.value as Tuple4Number;
      offs += fillVec4(d, offs, ...(direction as [number, number, number]), intensity); // direction
      offs += fillVec4(d, offs, ...fillColor); // color
    }

    return offs;
  }
}