import { DisplayObject, Renderable, SceneGraphNode, ShapeAttrs } from '@antv/g';
import { inject, injectable } from 'inversify';
import { mat3, vec3 } from 'gl-matrix';
import {
  Material3D,
  Geometry3D,
  Renderable3D,
  ModelBuilder,
  ShaderModuleService,
  gl,
  rgb2arr,
} from '@antv/g-plugin-webgl-renderer';
import imageVertex from './shaders/webgl.basic.vert.glsl';
import imageFragment from './shaders/webgl.basic.frag.glsl';

const primitiveUv1Padding = 4.0 / 64;
const primitiveUv1PaddingScale = 1.0 - primitiveUv1Padding * 2;

const ATTRIBUTE = {
  Position: 'a_Position',
  Normal: 'a_Normal',
  Uv: 'a_Uv',
};

const UNIFORM = {
  Color: 'u_Color',
  Map: 'u_Map',
  UvTransform: 'u_UvTransform',
};

/**
 * Render image with texture2d
 */
@injectable()
export class CubeModelBuilder implements ModelBuilder {
  @inject(ShaderModuleService)
  private shaderModule: ShaderModuleService;

  async onAttributeChanged(object: DisplayObject, name: string, value: any) {
    const entity = object.getEntity();
    const renderable = entity.getComponent(Renderable);
    const renderable3d = entity.getComponent(Renderable3D);
    // if we are updating sub renderable's attribute
    if (renderable3d.sourceEntity) {
      //
    } else {
      const material = entity.getComponent(Material3D);
      const geometry = entity.getComponent(Geometry3D);
    }
  }

  async prepareModel(object: DisplayObject) {
    const entity = object.getEntity();
    const material = entity.getComponent(Material3D);
    const geometry = entity.getComponent(Geometry3D);
    const renderable3d = entity.getComponent(Renderable3D);

    const { fill = '', map } = object.attributes;

    this.shaderModule.registerModule('material-basic', {
      vs: imageVertex,
      fs: imageFragment,
    });
    const { vs, fs, uniforms: extractedUniforms } = this.shaderModule.getModule('material-basic');

    material.vertexShaderGLSL = vs || '';
    material.fragmentShaderGLSL = fs || '';
    material.cull = {
      enable: true,
      face: gl.BACK,
    };
    material.depth = {
      enable: false,
    };

    const fillColor = rgb2arr(fill);
    material.setUniform({
      ...(extractedUniforms as Record<string, BufferData>),
      [UNIFORM.Color]: fillColor,
    });

    // TODO: Texture2D
    if (map) {
      material.setDefines({
        USE_UV: 1,
        USE_MAP: 1,
      });
      material.setUniform({
        [UNIFORM.Map]: map,
        [UNIFORM.UvTransform]: mat3.create(),
      });
    }

    const { indices, positions, normals, uvs, vertexCount } = this.buildAttributes(object.attributes);

    geometry.vertexCount = vertexCount;

    geometry.setIndex(indices);

    console.log(indices, positions);

    geometry.setAttribute(ATTRIBUTE.Position, Float32Array.from(positions), {
      arrayStride: 4 * 3,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float3',
        },
      ],
    });

    geometry.setAttribute(ATTRIBUTE.Normal, Float32Array.from(normals), {
      arrayStride: 4 * 3,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 1,
          offset: 0,
          format: 'float3',
        },
      ],
    });

    geometry.setAttribute(ATTRIBUTE.Uv, Float32Array.from(uvs), {
      arrayStride: 4 * 2,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 2,
          offset: 0,
          format: 'float2',
        },
      ],
    });
  }

  protected buildAttributes(attributes: ShapeAttrs) {
    const { widthSegments = 1, heightSegments = 1, depthSegments = 1, height = 0, width = 0, depth = 0 } = attributes;
    const ws = widthSegments;
    const hs = heightSegments;
    const ds = depthSegments;
    const hex = height / 2;
    const hey = width / 2;
    const hez = depth / 2;

    const corners = [
      vec3.fromValues(-hex, -hey, hez),
      vec3.fromValues(hex, -hey, hez),
      vec3.fromValues(hex, hey, hez),
      vec3.fromValues(-hex, hey, hez),
      vec3.fromValues(hex, -hey, -hez),
      vec3.fromValues(-hex, -hey, -hez),
      vec3.fromValues(-hex, hey, -hez),
      vec3.fromValues(hex, hey, -hez),
    ];

    const faceAxes = [
      [0, 1, 3], // FRONT
      [4, 5, 7], // BACK
      [3, 2, 6], // TOP
      [1, 0, 4], // BOTTOM
      [1, 4, 2], // RIGHT
      [5, 0, 6], // LEFT
      // [3, 2, 0], // FRONT
      // [7, 6, 4], // BACK
      // [0, 1, 5], // TOP
      // [2, 3, 7], // BOTTOM
      // [2, 7, 1], // RIGHT
      // [6, 3, 5], // LEFT
    ];

    const faceNormals = [
      [0, 0, 1], // FRONT
      [0, 0, -1], // BACK
      // [0, 1, 0], // TOP
      // [0, -1, 0], // BOTTOM
      [0, 1, 0], // TOP
      [0, -1, 0], // BOTTOM
      [1, 0, 0], // RIGHT
      [-1, 0, 0], // LEFT
    ];

    const sides = {
      FRONT: 0,
      BACK: 1,
      TOP: 2,
      BOTTOM: 3,
      RIGHT: 4,
      LEFT: 5,
    };

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const uvs1: number[] = [];
    const indices: number[] = [];
    let vcounter = 0;

    const generateFace = (side: number, uSegments: number, vSegments: number) => {
      let u;
      let v;
      let i;
      let j;

      for (i = 0; i <= uSegments; i++) {
        for (j = 0; j <= vSegments; j++) {
          const temp1 = vec3.create();
          const temp2 = vec3.create();
          const temp3 = vec3.create();
          const r = vec3.create();
          vec3.lerp(temp1, corners[faceAxes[side][0]], corners[faceAxes[side][1]], i / uSegments);
          vec3.lerp(temp2, corners[faceAxes[side][0]], corners[faceAxes[side][2]], j / vSegments);
          vec3.sub(temp3, temp2, corners[faceAxes[side][0]]);
          vec3.add(r, temp1, temp3);
          u = i / uSegments;
          v = j / vSegments;

          positions.push(r[0], r[1], r[2]);
          normals.push(faceNormals[side][0], faceNormals[side][1], faceNormals[side][2]);
          uvs.push(u, v);
          // pack as 3x2
          // 1/3 will be empty, but it's either that or stretched pixels
          // TODO: generate non-rectangular lightMaps, so we could use space without stretching
          u /= 3;
          v /= 3;
          u = u * primitiveUv1PaddingScale + primitiveUv1Padding;
          v = v * primitiveUv1PaddingScale + primitiveUv1Padding;
          u += (side % 3) / 3;
          v += Math.floor(side / 3) / 3;
          uvs1.push(u, v);

          if (i < uSegments && j < vSegments) {
            indices.push(vcounter + vSegments + 1, vcounter + 1, vcounter);
            indices.push(vcounter + vSegments + 1, vcounter + vSegments + 2, vcounter + 1);
          }

          vcounter++;
        }
      }
    };

    generateFace(sides.FRONT, ws, hs);
    generateFace(sides.BACK, ws, hs);
    generateFace(sides.TOP, ws, ds);
    generateFace(sides.BOTTOM, ws, ds);
    generateFace(sides.RIGHT, ds, hs);
    generateFace(sides.LEFT, ds, hs);

    return {
      indices,
      positions,
      normals,
      uvs,
      vertexCount: vcounter,
    };

    // TODO: barycentric & tangent
  }
}