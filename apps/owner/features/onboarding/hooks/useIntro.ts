// Intro pager data: static slides from lib (no service, no loading).
import { introSlides } from "../lib/introSlides.ts";
import type { IntroSlide } from "../lib/introSlides.ts";

export type IntroView = { slides: IntroSlide[] };

const INTRO_VIEW: IntroView = { slides: introSlides };

export function useIntro(): IntroView {
  return INTRO_VIEW;
}
