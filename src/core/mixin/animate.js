const MatrixUtil = require('../../util/matrix');
const PathUtil = require('../../util/path');
const Util = require('../../util/index');
const d3Ease = require('d3-ease');
const d3Timer = require('d3-timer');
const { interpolate, interpolateArray } = require('d3-interpolate'); // 目前整体动画只需要数值和数组的差值计算

module.exports = {
  /**
   * 执行动画
   * @param  {Object}   toProps  动画最终状态
   * @param  {Number}   duration 动画执行时间
   * @param  {Number}   delay    动画延迟时间
   * @param  {String}   easing   动画缓动效果
   * @param  {Function} callback 动画执行后的回调
   */
  animate(toProps, duration, delay = 0, easing, callback) {
    const self = this;
    const canvas = self.get('canvas');

    const formatProps = getFormatProps(toProps);
    const toAttrs = formatProps.attrs;
    const toM = formatProps.M;
    const fromAttrs = getfromAttrs(toAttrs);
    const fromM = Util.clone(self.getMatrix());
    easing = easing ? easing : 'easeLinear';

    const timer = d3Timer.timer(elapsed => {
      let ratio = elapsed / duration;

      if (ratio <= 1) {
        ratio = d3Ease[easing](ratio);
        update(ratio);
      } else {
        callback && callback();
        timer.stop();
      }
      canvas.draw();
    }, delay);
    d3Timer.timerFlush(); // 防止闪烁

    function update(ratio) {
      const cProps = {}; // 此刻属性
      if (self.get('destroyed')) {
        return;
      }
      let interf; //  差值函数

      for (const k in toAttrs) {
        if (!Util.isEqual(fromAttrs[k], toAttrs[k])) {
          if (k === 'path') {
            const toPath = PathUtil.parsePathString(toAttrs[k]); // 终点状态
            const fromPath = PathUtil.parsePathString(fromAttrs[k]); // 起始状态
            cProps[k] = [];
            for (let i = 0; i < toPath.length; i++) {
              const toPathPoint = toPath[i];
              const fromPathPoint = fromPath[i];
              const cPathPoint = [];
              for (let j = 0; j < toPathPoint.length; j++) {
                if (Util.isNumber(toPathPoint[j]) && fromPathPoint) {
                  interf = interpolate(fromPathPoint[j], toPathPoint[j]);
                  cPathPoint.push(interf(ratio));
                } else {
                  cPathPoint.push(toPathPoint[j]);
                }
              }
              cProps[k].push(cPathPoint);
            }
          } else {
            interf = interpolate(fromAttrs[k], toAttrs[k]);
            cProps[k] = interf(ratio);
          }
        }
      }
      if (toM) {
        const mf = interpolateArray(fromM, toM);
        const cM = mf(ratio);
        self.setMatrix(cM);
      }
      self.attr(cProps);
    }

    function getFormatProps(props) {
      const rst = {
        M: null,
        attrs: {}
      };
      for (const k in props) {
        if (k === 'transform') {
          rst.M = MatrixUtil.transform(self.getMatrix(), props[k]);
        } else if (k === 'matrix') {
          rst.M = props[k];
        } else {
          rst.attrs[k] = props[k];
        }
      }
      return rst;
    }

    function getfromAttrs(toAttrs) {
      const rst = {};
      for (const k in toAttrs) {
        rst[k] = self.attr(k);
      }
      return rst;
    }
  }
};
