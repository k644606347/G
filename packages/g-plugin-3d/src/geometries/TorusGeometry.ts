import { Mesh } from '@antv/g-plugin-webgl-renderer';
import { ProceduralGeometry } from './ProceduralGeometry';

export interface TorusGeometryProps {
  tubeRadius?: number;
  ringRadius?: number;
  segments?: number;
  sides?: number;
}

export class TorusGeometry extends ProceduralGeometry<TorusGeometryProps> {
  createTopology(mesh: Mesh<TorusGeometryProps>) {
    let x: number;
    let y: number;
    let z: number;
    let nx: number;
    let ny: number;
    let nz: number;
    let u: number;
    let v: number;
    let i: number;
    let j: number;

    const { tubeRadius = 0.2, ringRadius = 0.3, segments = 30, sides = 20 } = mesh.style;

    const rc = tubeRadius;
    const rt = ringRadius;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const uvs1: number[] = [];
    const indices: number[] = [];

    for (i = 0; i <= sides; i++) {
      for (j = 0; j <= segments; j++) {
        x =
          Math.cos((2.0 * Math.PI * j) / segments) *
          (rt + rc * Math.cos((2.0 * Math.PI * i) / sides));
        y = Math.sin((2.0 * Math.PI * i) / sides) * rc;
        z =
          Math.sin((2.0 * Math.PI * j) / segments) *
          (rt + rc * Math.cos((2.0 * Math.PI * i) / sides));

        nx = Math.cos((2.0 * Math.PI * j) / segments) * Math.cos((2.0 * Math.PI * i) / sides);
        ny = Math.sin((2.0 * Math.PI * i) / sides);
        nz = Math.sin((2.0 * Math.PI * j) / segments) * Math.cos((2.0 * Math.PI * i) / sides);

        u = i / sides;
        v = 1.0 - j / segments;

        positions.push(x, y, z);
        normals.push(nx, ny, nz);
        uvs.push(u, 1.0 - v);

        if (i < sides && j < segments) {
          let first, second, third, fourth;
          first = i * (segments + 1) + j;
          second = (i + 1) * (segments + 1) + j;
          third = i * (segments + 1) + (j + 1);
          fourth = (i + 1) * (segments + 1) + (j + 1);

          indices.push(first, second, third);
          indices.push(second, fourth, third);
        }
      }
    }

    return {
      indices,
      positions,
      normals,
      uvs,
      uv1s: uvs,
    };
  }
}