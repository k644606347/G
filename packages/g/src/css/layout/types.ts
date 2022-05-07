export type ContextId = string;

export enum LayoutTaskType {
  Layout = 'layout',
  IntrinsicSizes = 'intrinsic-sizes',
}

export interface LayoutOptions {
  /**
   *  = "block"
   */
  childDisplay: ChildDisplayType;
  /**
   * = "block-like
   */
  sizing: LayoutSizingMode;
}

enum ChildDisplayType {
  'block', // default - "blockifies" the child boxes.
  'normal',
}

enum LayoutSizingMode {
  'block-like', // default - Sizing behaves like block containers.
  'manual', // Sizing is specified by the web developer.
}

export interface IntrinsicSizes {
  readonly minContentInlineSize: number;
  readonly minContentBlockSize: number;
  readonly maxContentInlineSize: number;
  readonly maxContentBlockSize: number;
}

export interface LayoutConstraints<T = void> {
  /**
   * the available space the current layout must respect
   */
  readonly availableInlineSize: number;
  readonly availableBlockSize: number;

  /**
   * require current layout must to be exact size
   */
  readonly fixedInlineSize?: number;
  readonly fixedBlockSize?: number;

  /**
   * used to resolve percentage value
   * Web developers should resolve any percentages against the percentage sizes.
   * eg. `const value = constraints.percentageInlineSize * 0.5;`
   */
  readonly percentageInlineSize: number;
  readonly percentageBlockSize: number;

  readonly data: T;
}
