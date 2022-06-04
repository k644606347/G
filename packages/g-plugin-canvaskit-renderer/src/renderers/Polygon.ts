import { ContextService, DisplayObject, ParsedPolygonStyleProps } from '@antv/g';
import { inject, singleton } from 'mana-syringe';
import {
  CanvasKitContext,
  PolygonRendererContribution,
  RendererContribution,
  RendererContributionContext,
} from '../interfaces';

/**
 * @see https://fiddle.skia.org/c/@Path_addPoly
 */
@singleton({
  token: PolygonRendererContribution,
})
export class PolygonRenderer implements RendererContribution {
  @inject(ContextService)
  private contextService: ContextService<CanvasKitContext>;

  render(object: DisplayObject, context: RendererContributionContext) {
    const { CanvasKit } = this.contextService.getContext();
    const { canvas, fillPaint, strokePaint, shadowFillPaint, shadowStrokePaint } = context;

    const { shadowOffsetX, shadowOffsetY, defX, defY, points } =
      object.parsedStyle as ParsedPolygonStyleProps;

    const formattedPoints = points.points
      .map(([x, y]) => [x - defX, y - defY])
      .reduce<number[]>((prev, cur) => prev.concat(cur), []);

    if (shadowFillPaint || shadowStrokePaint) {
      const path = new CanvasKit.Path();
      path.addPoly(
        formattedPoints.map(
          (x, i) =>
            x + (i % 2 === 0 ? (shadowOffsetX?.value || 0) / 2 : (shadowOffsetY?.value || 0) / 2),
        ),
        true,
      );
      canvas.drawPath(path, fillPaint ? shadowFillPaint : shadowStrokePaint);
    }

    const path = new CanvasKit.Path();
    path.addPoly(formattedPoints, true);

    if (fillPaint) {
      canvas.drawPath(path, fillPaint);
    }
    if (strokePaint) {
      canvas.drawPath(path, strokePaint);
    }
  }
}
