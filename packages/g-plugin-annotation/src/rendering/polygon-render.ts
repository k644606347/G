import { Polyline } from '@antv/g';
import { DASH_LINE_STYLE } from '../constants/style';
import type { DrawerState } from '../interface/drawer';
import { renderDrawLine } from './drawline-render';
import { renderDrawPoints } from './drawPoint-render';

const renderDrawingLine = (context, anno: DrawerState) => {
  const total = anno.path.length;
  const drawingPoints = [anno.path[total - 2], anno.path[total - 1], anno.path[0]];
  const polyline = new Polyline({
    style: {
      points: drawingPoints.map((p) => [p.x, p.y]),
      ...DASH_LINE_STYLE,
    },
    className: anno.id,
    id: `${anno.id}-drawingline`,
  });
  context.canvas?.appendChild(polyline);
};

export const renderPolygon = (context, anno: DrawerState) => {
  renderDrawPoints(context, anno);
  renderDrawLine(context, anno);
  renderDrawingLine(context, anno);
};
