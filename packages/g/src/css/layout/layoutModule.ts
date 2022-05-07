import { ContainerModule } from 'inversify';
import { bindContributionProvider } from '../contribution-provider';
import { AbsoluteLayout } from './algo/absoluteLayout';
import { BlockLikeLayout } from './algo/blocklikeLayout';
import { RelativeLayout } from './algo/realtiveLayout';
import {
  ContextNode,
  FragmentResult,
  FragmentResultFactory,
  FragmentResultOptions,
} from './FragmentResult';
import { LayoutChildren, LayoutChildrenFactory, LayoutChildrenOptions } from './LayoutChildren';
import { LayoutContext, LayoutContextFactory, LayoutContextOptions } from './layoutContext';
import { LayoutEdges, LayoutEdgesFactory, LayoutEdgesOptions } from './LayoutEdges';
import { LayoutEngine } from './layoutEngine';
import { LayoutFragment, LayoutFragmentFactory, LayoutFragmentOptions } from './LayoutFragment';
import { LayoutContribution, LayoutRegistry } from './layoutRegistry';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const layoutModule = new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(LayoutEngine).toSelf().inSingletonScope();

  bind(LayoutEdges).toSelf();
  bind(LayoutEdgesFactory).toFactory((context) => (options: LayoutEdgesOptions) => {
    const container = context.container.createChild();
    container.bind(LayoutEdgesOptions).toConstantValue(options);
    return container.get(LayoutEdges);
  });

  bind<LayoutContextFactory>(LayoutContextFactory).toFactory((context) => (options) => {
    const container = context.container.createChild();
    container.bind(LayoutContext).toSelf().inSingletonScope();

    container.bind(LayoutChildren).toSelf();
    container
      .bind(LayoutChildrenFactory)
      .toFactory((childContext) => (childOptions: LayoutChildrenOptions) => {
        const childContainer = childContext.container.createChild();
        childContainer.bind(LayoutChildrenOptions).toConstantValue(childOptions);
        return childContainer.get(LayoutChildren);
      });

    container.bind(FragmentResult).toSelf();
    container.bind(FragmentResultFactory).toFactory((childContext) => (childOptions, node) => {
      const childContainer = childContext.container.createChild();
      childContainer.bind(FragmentResultOptions).toConstantValue(childOptions);
      childContainer.bind(ContextNode).toConstantValue(node);
      return childContainer.get(FragmentResult);
    });

    container.bind(LayoutFragment).toSelf();
    container.bind(LayoutFragmentFactory).toFactory((childContext) => (childOptions) => {
      const childContainer = childContext.container.createChild();
      childContainer.bind(LayoutFragmentOptions).toConstantValue(childOptions);
      return childContainer.get(LayoutFragment);
    });

    const layoutChildrenFactory = container.get(LayoutChildrenFactory);
    const layoutFragmentFactory = container.get(LayoutFragmentFactory);
    const fragmentResultFactory = container.get(FragmentResultFactory);

    container.bind<LayoutContextOptions>(LayoutContextOptions).toConstantValue({
      ...options,
      layoutChildrenFactory,
      layoutFragmentFactory,
      fragmentResultFactory,
    });

    const layoutContext = container.get(LayoutContext);

    return layoutContext;
  });

  bind(LayoutRegistry).toSelf().inSingletonScope();
  bindContributionProvider(bind, LayoutContribution);

  bind(AbsoluteLayout).toSelf().inSingletonScope();
  bind(LayoutContribution).toService(AbsoluteLayout);

  bind(RelativeLayout).toSelf().inSingletonScope();
  bind(LayoutContribution).toService(RelativeLayout);

  bind(BlockLikeLayout).toSelf().inSingletonScope();
  bind(LayoutContribution).toService(BlockLikeLayout);
});
