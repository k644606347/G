import { vec3, mat4 } from 'gl-matrix';
import { injectable, inject } from 'inversify';
import {
  DisplayObject,
  PARSED_COLOR_TYPE,
  Tuple4Number,
  RenderingService,
  SHAPE,
  Renderable,
  DefaultCamera,
  Camera,
} from '@antv/g';
import { Geometry } from '../Geometry';
import { Renderable3D } from '../components/Renderable3D';
import { Device, Format, InputState, VertexBufferFrequency } from '../platform';
import { TextureMapping } from '../render/TextureHolder';
import { RenderHelper } from '../render/RenderHelper';
import { RenderInstList } from '../render/RenderInstList';
import { DeviceProgram } from '../render/DeviceProgram';
import { preprocessProgramObj_GLSL, ProgramDescriptorSimpleWithOrig } from '../shader/compiler';
import { makeSortKeyOpaque, RendererLayer } from '../render/utils';
import { RenderInst } from '../render/RenderInst';

let counter = 1;
export interface Batch {
  beforeRender?(list: RenderInstList): void;
  afterRender?(list: RenderInstList): void;
}
/**
 * A container for multiple display objects with the same `style`,
 * eg. 1000 Circles with the same stroke color, but their position, radius can be different
 */
@injectable()
export abstract class Batch {
  static tag = 'batch';

  /**
   * common attributes shared by all shapes
   */
  static AttributeLocation = {
    // TODO: bind mat4 in WebGL2 instead of decomposed 4 * vec4?
    // @see https://stackoverflow.com/questions/38853096/webgl-how-to-bind-values-to-a-mat4-attribute/38853623#38853623
    a_ModelMatrix0: 0,
    a_ModelMatrix1: 1,
    a_ModelMatrix2: 2,
    a_ModelMatrix3: 3, // model matrix
    a_Color: 4, // fill color
    a_StrokeColor: 5, // stroke color
    a_StylePacked1: 6, // opacity fillOpacity strokeOpacity lineWidth
    a_PickingColor: 7, // picking color
    a_Anchor: 8, // anchor
  };

  /**
   * common shader chunks
   * TODO: use *.glsl instead of string
   */
  static ShaderLibrary = {
    BothDeclaration: `
layout(std140) uniform ub_SceneParams {
  mat4 u_ProjectionMatrix;
  mat4 u_ViewMatrix;
  vec3 u_CameraPosition;
  float u_DevicePixelRatio;
};
    `,
    VertDeclaration: `
layout(location = ${Batch.AttributeLocation.a_ModelMatrix0}) attribute vec4 a_ModelMatrix0;
layout(location = ${Batch.AttributeLocation.a_ModelMatrix1}) attribute vec4 a_ModelMatrix1;
layout(location = ${Batch.AttributeLocation.a_ModelMatrix2}) attribute vec4 a_ModelMatrix2;
layout(location = ${Batch.AttributeLocation.a_ModelMatrix3}) attribute vec4 a_ModelMatrix3;
layout(location = ${Batch.AttributeLocation.a_Color}) attribute vec4 a_Color;
layout(location = ${Batch.AttributeLocation.a_StrokeColor}) attribute vec4 a_StrokeColor;
layout(location = ${Batch.AttributeLocation.a_StylePacked1}) attribute vec4 a_StylePacked1;
layout(location = ${Batch.AttributeLocation.a_PickingColor}) attribute vec4 a_PickingColor;
layout(location = ${Batch.AttributeLocation.a_Anchor}) attribute vec2 a_Anchor;

varying vec4 v_PickingResult;
varying vec4 v_Color;
varying vec4 v_StrokeColor;
varying vec4 v_StylePacked1;

#define COLOR_SCALE 1. / 255.
void setPickingColor(vec3 pickingColor) {
  v_PickingResult.rgb = pickingColor * COLOR_SCALE;
}
    `,
    FragDeclaration: `
varying vec4 v_PickingResult;
varying vec4 v_Color;
varying vec4 v_StrokeColor;
varying vec4 v_StylePacked1;
    `,
    Vert: `
    mat4 u_ModelMatrix = mat4(a_ModelMatrix0, a_ModelMatrix1, a_ModelMatrix2, a_ModelMatrix3);
    vec4 u_StrokeColor = a_StrokeColor;
    float u_Opacity = a_StylePacked1.x;
    float u_FillOpacity = a_StylePacked1.y;
    float u_StrokeOpacity = a_StylePacked1.z;
    float u_StrokeWidth = a_StylePacked1.w;
    float u_ZIndex = a_PickingColor.w;

    #ifdef CLIPSPACE_NEAR_ZERO
      gl_Position.z = gl_Position.z * 0.5 + 0.5;
    #endif

    setPickingColor(a_PickingColor.xyz);

    v_Color = a_Color;
    v_StrokeColor = a_StrokeColor;
    v_StylePacked1 = a_StylePacked1;
    `,
    Frag: `
    vec4 u_Color = v_Color;
    vec4 u_StrokeColor = v_StrokeColor;
    float u_Opacity = v_StylePacked1.x;
    float u_FillOpacity = v_StylePacked1.y;
    float u_StrokeOpacity = v_StylePacked1.z;
    float u_StrokeWidth = v_StylePacked1.w;

    gbuf_picking = vec4(v_PickingResult.rgb, 1.0);
    `,
    UvVert: `
    #ifdef USE_UV
      v_Uv = a_Uv;
    #endif

    #ifdef VIEWPORT_ORIGIN_TL
      v_Uv.y = 1.0 - v_Uv.y;
    #endif
    `,
  };

  static CommonBufferIndex = 0;

  @inject(RenderHelper)
  protected renderHelper: RenderHelper;

  @inject(DefaultCamera)
  protected camera: Camera;

  device: Device;

  renderingService: RenderingService;

  id = counter++;

  type: string;

  objects: DisplayObject[] = [];

  geometry: Geometry;

  inputState: InputState;

  mapping: TextureMapping;

  recreateGeometry = true;

  recreateInputState = true;

  recreateProgram = true;

  programDescriptorSimpleWithOrig: ProgramDescriptorSimpleWithOrig;

  protected abstract program: DeviceProgram;

  protected instanced = true;

  init(device: Device, renderingService: RenderingService) {
    this.device = device;
    this.renderingService = renderingService;
    this.geometry = new Geometry();
    this.geometry.device = this.device;
  }

  /**
   * provide validator for current shape
   */
  protected abstract validate(object: DisplayObject): boolean;
  checkBatchable(object: DisplayObject): boolean {
    if (this.objects.length === 0) {
      return true;
    }

    const instance = this.objects[0];
    if (instance.nodeName !== object.nodeName) {
      return false;
    }

    return this.validate(object);
  }

  merge(object: DisplayObject) {
    this.type = object.nodeName;

    if (this.objects.indexOf(object) === -1) {
      this.objects.push(object);
      this.recreateGeometry = true;
    }

    // TODO: z-index
  }

  purge(object: DisplayObject) {
    this.recreateGeometry = true;
    const index = this.objects.indexOf(object);
    this.objects.splice(index, 1);
  }

  protected abstract buildGeometry(): void;

  private createGeometry() {
    if (this.instanced) {
      const packed = [];
      this.objects.forEach((object) => {
        const {
          fill,
          stroke,
          opacity,
          fillOpacity,
          strokeOpacity,
          lineWidth = 0,
          anchor,
          zIndex = 0,
        } = object.parsedStyle;
        let fillColor: Tuple4Number = [0, 0, 0, 0];
        if (fill?.type === PARSED_COLOR_TYPE.Constant) {
          fillColor = fill.value;
        }
        let strokeColor: Tuple4Number = [0, 0, 0, 0];
        if (stroke?.type === PARSED_COLOR_TYPE.Constant) {
          strokeColor = stroke.value;
        }

        const modelMatrix = mat4.copy(mat4.create(), object.getWorldTransform());

        const encodedPickingColor = object.entity.getComponent(Renderable3D).encodedPickingColor;

        packed.push(
          ...modelMatrix,
          ...fillColor,
          ...strokeColor,
          opacity,
          fillOpacity,
          strokeOpacity,
          lineWidth,
          ...encodedPickingColor,
          zIndex,
          anchor[0],
          anchor[1],
        );
      });

      this.geometry.maxInstancedCount = this.objects.length;

      this.geometry.setVertexBuffer({
        bufferIndex: Batch.CommonBufferIndex,
        byteStride: 4 * (4 * 4 + 4 + 4 + 4 + 4 + 2),
        frequency: VertexBufferFrequency.PerInstance,
        attributes: [
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 0,
            location: Batch.AttributeLocation.a_ModelMatrix0,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 4,
            location: Batch.AttributeLocation.a_ModelMatrix1,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 8,
            location: Batch.AttributeLocation.a_ModelMatrix2,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 12,
            location: Batch.AttributeLocation.a_ModelMatrix3,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 16,
            location: Batch.AttributeLocation.a_Color,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 20,
            location: Batch.AttributeLocation.a_StrokeColor,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 24,
            location: Batch.AttributeLocation.a_StylePacked1,
            divisor: 1,
          },
          {
            format: Format.F32_RGBA,
            bufferByteOffset: 4 * 28,
            location: Batch.AttributeLocation.a_PickingColor,
            divisor: 1,
          },
          {
            format: Format.F32_RG,
            bufferByteOffset: 4 * 32,
            location: Batch.AttributeLocation.a_Anchor,
            divisor: 1,
          },
        ],
        data: new Float32Array(packed),
      });
    }

    this.buildGeometry();
  }

  destroy() {
    if (this.geometry) {
      this.geometry.destroy();
    }
    if (this.inputState) {
      this.inputState.destroy();
    }
  }

  protected abstract uploadUBO(renderInst: RenderInst): void;

  render(list: RenderInstList) {
    if (this.recreateGeometry) {
      if (this.geometry) {
        this.geometry.destroy();
      }
      this.createGeometry();
      this.recreateGeometry = false;
      this.recreateInputState = true;
    }

    if (this.beforeRender) {
      this.beforeRender(list);
    }

    // cached input layout
    const inputLayout = this.renderHelper
      .getCache()
      .createInputLayout(this.geometry.inputLayoutDescriptor);

    // prevent rebinding VAO too many times
    if (this.recreateInputState) {
      if (this.inputState) {
        this.inputState.destroy();
      }
      this.inputState = this.device.createInputState(
        inputLayout,
        this.geometry.vertexBuffers.map((buffer) => ({
          buffer,
          byteOffset: 0,
        })),
        { buffer: this.geometry.indicesBuffer, byteOffset: 0 },
      );
      this.recreateInputState = false;
    }

    // use cached program
    if (this.recreateProgram) {
      this.programDescriptorSimpleWithOrig = preprocessProgramObj_GLSL(this.device, this.program);
      this.recreateProgram = false;
    }
    const program = this.renderHelper
      .getCache()
      .createProgramSimple(this.programDescriptorSimpleWithOrig);

    // new render instance
    const renderInst = this.renderHelper.renderInstManager.newRenderInst();
    renderInst.setProgram(program);
    renderInst.setInputLayoutAndState(inputLayout, this.inputState);

    // bind UBO and upload
    // TODO: no need to re-upload unchanged uniforms
    this.uploadUBO(renderInst);

    // draw elements
    renderInst.drawIndexesInstanced(this.geometry.vertexCount, this.geometry.maxInstancedCount);
    renderInst.sortKey = makeSortKeyOpaque(RendererLayer.OPAQUE, program.id);
    this.renderHelper.renderInstManager.submitRenderInst(renderInst, list);

    if (this.afterRender) {
      this.afterRender(list);
    }

    // finish rendering...
    this.objects.forEach((object) => {
      const renderable = object.entity.getComponent(Renderable);
      renderable.dirty = false;
    });
  }

  updateAttribute(object: DisplayObject, name: string, value: any): void {
    const index = this.objects.indexOf(object);
    const geometry = this.geometry;
    const stylePacked1 = ['opacity', 'fillOpacity', 'strokeOpacity', 'lineWidth'];

    if (this.instanced) {
      if (name === 'fill') {
        const { fill } = object.parsedStyle;
        let fillColor: Tuple4Number = [0, 0, 0, 0];
        if (fill?.type === PARSED_COLOR_TYPE.Constant) {
          fillColor = fill.value;
        }

        geometry.updateVertexBuffer(
          Batch.CommonBufferIndex,
          Batch.AttributeLocation.a_Color,
          index,
          new Uint8Array(new Float32Array([...fillColor]).buffer),
        );
      } else if (name === 'stroke') {
        const { stroke } = object.parsedStyle;
        let strokeColor: Tuple4Number = [0, 0, 0, 0];
        if (stroke?.type === PARSED_COLOR_TYPE.Constant) {
          strokeColor = stroke.value;
        }

        geometry.updateVertexBuffer(
          Batch.CommonBufferIndex,
          Batch.AttributeLocation.a_StrokeColor,
          index,
          new Uint8Array(new Float32Array([...strokeColor]).buffer),
        );
      } else if (stylePacked1.indexOf(name) > -1) {
        const { opacity, fillOpacity, strokeOpacity, lineWidth = 0 } = object.parsedStyle;
        geometry.updateVertexBuffer(
          Batch.CommonBufferIndex,
          Batch.AttributeLocation.a_StylePacked1,
          index,
          new Uint8Array(new Float32Array([opacity, fillOpacity, strokeOpacity, lineWidth]).buffer),
        );
      } else if (name === 'zIndex') {
        const encodedPickingColor = object.entity.getComponent(Renderable3D).encodedPickingColor;
        geometry.updateVertexBuffer(
          Batch.CommonBufferIndex,
          Batch.AttributeLocation.a_PickingColor,
          index,
          new Uint8Array(
            new Float32Array([...encodedPickingColor, object.parsedStyle.zIndex]).buffer,
          ),
        );
      } else if (name === 'modelMatrix') {
        const modelMatrix = mat4.copy(mat4.create(), object.getWorldTransform());
        geometry.updateVertexBuffer(
          Batch.CommonBufferIndex,
          Batch.AttributeLocation.a_ModelMatrix0,
          index,
          new Uint8Array(new Float32Array(modelMatrix).buffer),
        );
      } else if (name === 'anchor') {
        const { anchor } = object.parsedStyle;
        geometry.updateVertexBuffer(
          Batch.CommonBufferIndex,
          Batch.AttributeLocation.a_Anchor,
          index,
          new Uint8Array(new Float32Array([anchor[0], anchor[1]]).buffer),
        );
      }
    }
  }
}