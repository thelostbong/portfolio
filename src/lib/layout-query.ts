// Which layout the site uses. "compact" is phones and small tablets: narrow screens, and
// touch screens up to tablet size (including phones held sideways). Everything else gets
// the wide layout. CSS reads it through the `compact:` variant (globals.css), JS through
// useCompact() in layout.ts. Kept in its own file so the root layout can inline it.
export const COMPACT_QUERY =
  "(max-width: 900px), (pointer: coarse) and (max-width: 1100px), (pointer: coarse) and (max-height: 500px)";

// Runs in <head> before the first paint, so the right layout styles apply from the start.
export const LAYOUT_SCRIPT = `(function(){try{var m=window.matchMedia(${JSON.stringify(COMPACT_QUERY)});var s=function(){document.documentElement.setAttribute("data-layout",m.matches?"compact":"wide")};s();m.addEventListener("change",s)}catch(e){}})();`;
