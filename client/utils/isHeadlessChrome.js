export function isHeadlessChrome() {
  return /HeadlessChrome/.test(window.navigator.userAgent);
}
