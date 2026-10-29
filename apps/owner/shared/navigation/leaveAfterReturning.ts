// A DOM component awaits the native action it called, and Expo's DOM bridge sends
// the result back into that action's WebView. Navigating inside the action unmounts
// the WebView first, so the result has nowhere to go and the bridge rejects with
// "Unable to find the 'DomWebView' view". Deferring the navigation one macrotask
// lets the action return while its WebView still exists.
export function leaveAfterReturning(navigate: () => void): void {
  setTimeout(navigate, 0);
}
