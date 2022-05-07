/**
 * a general css typed object model in user land, extend and modified for Pailye.
 * ref: https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API ,
 */

import type { CSSStyleValue } from '../cssom';
import { ObjectTyped } from '../util';
import type { StyleInputValue, StyleProperty } from './types';

export class StylePropertyMap {
  static merge(...styles: StylePropertyMap[]) {
    const newStyle = new StylePropertyMap();
    styles.forEach((style) => {
      style.forEach((value, key) => {
        newStyle.set(key, value);
      });
    });
    return newStyle;
  }

  /**
   * create style
   */
  static create(styles: Record<string, Record<StyleProperty, StyleInputValue>>) {
    const output: Record<string, StylePropertyMap> = {};
    ObjectTyped.keys(styles).forEach((key) => {
      const style = new StylePropertyMap();
      ObjectTyped.keys(styles[key]).forEach((property) => {
        const parserName = styleSheetManager.propertyRegistry.get(property)?.parser;
        if (!parserName) {
          throw new Error(`Invalid property: ${property}`);
        }
        const parser = styleSheetManager.propertyParserRegistry.get(parserName);
        if (!parser) {
          throw new Error(`Invalid property parser: ${parserName}`);
        }
        try {
          const parsedValue = parser.parse(styles[key][property]);
          style.set(property, parsedValue);
        } catch (error) {
          // invalid value should be ignored
          // console.log(`parsing property: ${property} error. ${error}`);
        }
      });
      output[key] = style;
    });
    // @ts-ignore
    return output;
  }

  private styleMap: Map<StyleProperty, CSSStyleValue>;

  constructor() {
    this.styleMap = new Map();
  }

  get<T extends CSSStyleValue>(property: StyleProperty) {
    return this.styleMap.get(property) as T | undefined;
  }

  set(property: StyleProperty, value: CSSStyleValue) {
    this.styleMap.set(property, value);
  }

  forEach(
    callbackfn: (
      value: CSSStyleValue,
      key: StyleProperty,
      map: Map<StyleProperty, CSSStyleValue>,
    ) => void,
  ) {
    this.styleMap.forEach(callbackfn);
  }

  append(property: StyleProperty, value: CSSStyleValue) {
    this.styleMap.set(property, value);
  }

  delete(property: StyleProperty) {
    this.styleMap.delete(property);
  }

  clear() {
    this.styleMap.clear();
  }
}
