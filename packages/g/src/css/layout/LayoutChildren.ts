/* eslint-disable @typescript-eslint/no-redeclare */
import { inject, injectable } from 'inversify';
import type { LayoutObject } from './LayoutObject';
import type { StylePropertyMap } from '../style/stylePropertyMap';
import { Deferred } from '../util';
import { LayoutContext } from './layoutContext';
import type { LayoutFragment } from './LayoutFragment';
import type { IntrinsicSizes, LayoutConstraints } from './types';
import { LayoutTaskType } from './types';

export const LayoutChildrenFactory = Symbol('LayoutChildrenFactory');
export interface LayoutChildrenFactory {
  (options: LayoutChildrenOptions): LayoutChildren;
}

export const LayoutChildrenOptions = Symbol('LayoutChildrenOptions');
export interface LayoutChildrenOptions {
  node: LayoutObject;
}

@injectable()
export class LayoutChildren {
  node: LayoutObject;
  readonly styleMap: StylePropertyMap;
  layoutContext: LayoutContext;

  constructor(
    @inject(LayoutContext) protected readonly _layoutContext: LayoutContext,
    @inject(LayoutChildrenOptions) protected readonly options: LayoutChildrenOptions,
  ) {
    this.layoutContext = _layoutContext;
    this.node = options.node;
    this.styleMap = options.node.getAllStyle();
  }

  intrinsicSizes(): Promise<IntrinsicSizes> {
    // if (this.contextId !== this.layoutContext.contextId) {
    //   throw new Error('Invalid State: wrong layout context');
    // }
    const deferred = new Deferred<IntrinsicSizes>();
    this.layoutContext.appendWorkTask({
      layoutChild: this,
      taskType: LayoutTaskType.IntrinsicSizes,
      deferred,
    });
    return deferred.promise;
  }

  layoutNextFragment(constraints: LayoutConstraints): Promise<LayoutFragment> {
    // if (this.layoutContext.contextId !== this.layoutContext.contextId) {
    //   throw new Error('Invalid State: wrong layout context');
    // }

    if (this.layoutContext.mode === LayoutTaskType.IntrinsicSizes) {
      throw new Error('Not Supported: cant call layoutNextFragment in intrinsicSizes');
    }
    const deferred = new Deferred<LayoutFragment>();
    this.layoutContext.appendWorkTask({
      layoutConstraints: constraints,
      layoutChild: this,
      taskType: LayoutTaskType.Layout,
      deferred,
    });
    return deferred.promise;
  }
}
