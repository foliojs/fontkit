/** The features a shaper applies, in stages */
export interface ShapingPlan {
  /** Adds features to the last stage, applied to every glyph unless `global` is false */
  add(features: string | string[], global?: boolean): void;
}

/** The fallback shaper for scripts without a registered shaper, and the base class of the other shapers */
export class DefaultShaper {
  /** The OpenType script tags that `registerShaper` registers this shaper for by default */
  static scripts: string[];

  /** Adds the features this shaper applies to the plan */
  static planFeatures(plan: ShapingPlan): void;
}
