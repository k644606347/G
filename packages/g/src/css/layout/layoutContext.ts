/* eslint-disable @typescript-eslint/no-redeclare */
import { guid } from '../guid';
import type { LayoutWorkTask } from './LayoutWorkTask';
import type { LayoutTaskType } from './types';
import type { ContextId } from './types';
import { inject, injectable } from 'inversify';
import type { FragmentResultFactory } from './FragmentResult';
import type { LayoutChildrenFactory } from './LayoutChildren';
import type { LayoutFragmentFactory } from './LayoutFragment';

export const LayoutContextFactory = Symbol('LayoutContextFactory');
export interface LayoutContextFactory {
  (options: { mode: LayoutTaskType }): LayoutContext;
}

export const LayoutContextOptions = Symbol('LayoutContextOptions');
export interface LayoutContextOptions {
  mode: LayoutTaskType;
  layoutChildrenFactory: LayoutChildrenFactory;

  fragmentResultFactory: FragmentResultFactory;

  layoutFragmentFactory: LayoutFragmentFactory;
}

/**
 * 每次layout 有单独的 context
 */
@injectable()
export class LayoutContext {
  contextId: ContextId;
  workQueue: LayoutWorkTask[] = [];
  mode: LayoutTaskType;

  layoutChildrenFactory: LayoutChildrenFactory;

  fragmentResultFactory: FragmentResultFactory;

  layoutFragmentFactory: LayoutFragmentFactory;

  constructor(@inject(LayoutContextOptions) protected readonly options: LayoutContextOptions) {
    this.contextId = guid();
    this.mode = options.mode;
    this.layoutChildrenFactory = options.layoutChildrenFactory;
    this.fragmentResultFactory = options.fragmentResultFactory;
    this.layoutFragmentFactory = options.layoutFragmentFactory;
  }

  appendWorkTask(work: LayoutWorkTask) {
    this.workQueue.push(work);
  }

  clearWorkQueue() {
    this.workQueue = [];
  }
}
