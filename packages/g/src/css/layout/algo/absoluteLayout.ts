/* eslint-disable max-classes-per-file */
import { injectable } from 'inversify';
import type { StylePropertyMap } from '../../style/stylePropertyMap';
import type { FragmentResultOptions, FragmentResult } from '../FragmentResult';
import type { LayoutChildren } from '../LayoutChildren';
import { AbstractLayoutDefinition } from '../LayoutDefinition';
import type { LayoutEdges } from '../LayoutEdges';
import type { LayoutContribution, LayoutRegistry } from '../layoutRegistry';
import type { IntrinsicSizes, LayoutConstraints } from '../types';

class AbsoluteLayoutDefinition extends AbstractLayoutDefinition {
  intrinsicSizes(
    children: LayoutChildren[],
    edges: LayoutEdges,
    styleMap: StylePropertyMap,
  ): Promise<IntrinsicSizes> {
    throw new Error('Method not implemented.');
  }
  layout(
    children: LayoutChildren[],
    edges: LayoutEdges,
    constraints: LayoutConstraints,
    styleMap: StylePropertyMap,
  ): Promise<FragmentResultOptions<void> | FragmentResult<void>> {
    throw new Error('Method not implemented.');
  }
}

@injectable()
export class AbsoluteLayout implements LayoutContribution {
  registerLayout(layoutRegistry: LayoutRegistry) {
    layoutRegistry.registerLayout('absolute', AbsoluteLayoutDefinition);
  }
}
