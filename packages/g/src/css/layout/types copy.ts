export type MeasureFn = (
  width?: number,
  height?: number,
) => {
  width: number;
  height: number;
};

export interface ComputedLayout {
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
  readonly children: ComputedLayout[];
}
