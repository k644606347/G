/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-classes-per-file */
import type { FragmentResult, FragmentResultOptions } from '../FragmentResult';
import type { LayoutChildren } from '../LayoutChildren';
import { AbstractLayoutDefinition } from '../LayoutDefinition';
import type { LayoutEdges } from '../LayoutEdges';
import type { LayoutConstraints, IntrinsicSizes } from '../types';
import type { StylePropertyMap } from '../../style/stylePropertyMap';
import type { LayoutContribution, LayoutRegistry } from '../layoutRegistry';
import { injectable } from 'inversify';
import type { LayoutFragment } from '../LayoutFragment';

/**
 * The layout algorithm below performs a block-like layout (positioning fragments sequentially in the block direction),
 *  while centering its children in the inline direction.
 */
export class BlockLikeLayoutDefinition extends AbstractLayoutDefinition {
  async intrinsicSizes(children: LayoutChildren[], edges: LayoutEdges, styleMap: StylePropertyMap) {
    const childrenSizes = await Promise.all(
      children.map((child) => {
        return child.intrinsicSizes();
      }),
    );

    const maxContentInlineSize =
      childrenSizes.reduce((max, childSizes) => {
        return Math.max(max, childSizes.maxContentInlineSize);
      }, 0) + edges.inline;

    const minContentInlineSize =
      childrenSizes.reduce((max, childSizes) => {
        return Math.max(max, childSizes.maxContentInlineSize);
      }, 0) + edges.inline;

    return {
      maxContentInlineSize,
      minContentInlineSize,
      maxContentBlockSize: 0,
      minContentBlockSize: 0,
    };
  }
  async layout(
    children: LayoutChildren[],
    edges: LayoutEdges,
    constraints: LayoutConstraints,
    styleMap: StylePropertyMap,
  ): Promise<FragmentResultOptions | FragmentResult> {
    // Determine our (inner) available size.
    const availableInlineSize = constraints.fixedInlineSize
      ? constraints.fixedInlineSize - edges.inline
      : 0;
    const availableBlockSize = constraints.fixedBlockSize
      ? constraints.fixedBlockSize - edges.block
      : 0;

    let childFragments: LayoutFragment[] = [];
    const childConstraints = {
      availableInlineSize,
      availableBlockSize,
      percentageInlineSize: availableInlineSize,
      percentageBlockSize: availableBlockSize,
      data: constraints.data,
    };

    childFragments = await Promise.all(
      children.map((child) => {
        return child.layoutNextFragment(childConstraints);
      }),
    );

    let blockOffset = edges.blockStart;
    // eslint-disable-next-line no-restricted-syntax
    for (const fragment of childFragments) {
      // Position the fragment in a block like manner, centering it in the
      // inline direction.
      fragment.blockOffset = blockOffset;
      fragment.inlineOffset = Math.max(
        edges.inlineStart,
        (availableInlineSize - fragment.inlineSize) / 2,
      );

      blockOffset += fragment.blockSize;
    }

    const autoBlockSize = blockOffset + edges.blockEnd;

    return {
      autoBlockSize,
      childFragments,
      inlineSize: availableInlineSize,
      blockSize: availableBlockSize,
      data: constraints.data,
    };
  }
}

@injectable()
export class BlockLikeLayout implements LayoutContribution {
  registerLayout(layoutRegistry: LayoutRegistry) {
    layoutRegistry.registerLayout('blockLike', BlockLikeLayoutDefinition);
  }
}
