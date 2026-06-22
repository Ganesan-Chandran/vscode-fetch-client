export function syncAceWithVSCodeTheme() {
  const style = getComputedStyle(document.body);

  const get = (v: string) => style.getPropertyValue(v).trim();

  const bg          = get("--vscode-editor-background");
  const fg          = get("--vscode-editor-foreground");
  const selBg       = get("--vscode-editor-selectionBackground");
  const lineHL      = get("--vscode-editor-lineHighlightBackground");
  const cursor      = get("--vscode-editorCursor-foreground");
  const gutterBg    = get("--vscode-editorGutter-background") || bg;
  const lineNumFg   = get("--vscode-editorLineNumber-foreground");
  const lineNumAFg  = get("--vscode-editorLineNumber-activeForeground") || fg;
  const scrollbarBg = get("--vscode-scrollbarSlider-background");
  const scrollbarHv = get("--vscode-scrollbarSlider-hoverBackground");
  const borderColor = get("--vscode-editorWidget-border") || "transparent";
  const findBg      = get("--vscode-editorWidget-background") || bg;
  const findFg      = get("--vscode-editorWidget-foreground") || fg;

  // Syntax tokens
  const keyword  = get("--vscode-symbolIcon-keywordForeground");
  const string   = get("--vscode-debugTokenExpression-string");
  const number   = get("--vscode-debugTokenExpression-number");
  const comment  = get("--vscode-editorLineNumber-foreground");
  const fnColor  = get("--vscode-symbolIcon-functionForeground");
  const varColor = get("--vscode-symbolIcon-variableForeground");
  const typeColor = get("--vscode-symbolIcon-classForeground");

  const cssId = "ace-vscode-theme-sync";
  let el = document.getElementById(cssId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = cssId;
    document.head.appendChild(el);
  }

  el.textContent = `
    /* ── Editor canvas ── */
    .ace_editor                        { background-color: ${bg} !important; color: ${fg} !important; }

    /* ── Gutter ── */
    .ace_gutter                        { background-color: ${gutterBg} !important; color: ${lineNumFg} !important; border-right: 1px solid ${borderColor} !important; }
    .ace_gutter-active-line            { background-color: ${lineHL} !important; color: ${lineNumAFg} !important; }

    /* ── Active line ── */
    .ace_active-line                   { background-color: ${lineHL} !important; }

    /* ── Cursor ── */
    .ace_cursor                        { color: ${cursor || fg} !important; border-left-color: ${cursor || fg} !important; }

    /* ── Selection ── */
    .ace_selection                     { background-color: ${selBg} !important; }
    .ace_selected-word                 { border: 1px solid ${selBg} !important; }

    /* ── Scrollbar ── */
    .ace_scrollbar-v::-webkit-scrollbar-thumb,
    .ace_scrollbar-h::-webkit-scrollbar-thumb { background-color: ${scrollbarBg} !important; }
    .ace_scrollbar-v::-webkit-scrollbar-thumb:hover,
    .ace_scrollbar-h::-webkit-scrollbar-thumb:hover { background-color: ${scrollbarHv} !important; }

    /* ── Search box (ext-searchbox) ── */
    .ace_search                        { background-color: ${findBg} !important; color: ${findFg} !important; border-color: ${borderColor} !important; }
    .ace_search_field                  { background-color: ${bg} !important; color: ${fg} !important; border-color: ${borderColor} !important; }
    .ace_searchbtn                     { background-color: ${bg} !important; color: ${fg} !important; border-color: ${borderColor} !important; }

    /* ── Syntax tokens ── */
    .ace_keyword, .ace_keyword.ace_operator   { color: ${keyword  || "#569cd6"} !important; }
    .ace_string                               { color: ${string   || "#ce9178"} !important; }
    .ace_constant.ace_numeric                 { color: ${number   || "#b5cea8"} !important; }
    .ace_comment, .ace_comment.ace_line       { color: ${comment  || "#6a9955"} !important; font-style: italic; }
    .ace_entity.ace_name.ace_function         { color: ${fnColor  || "#dcdcaa"} !important; }
    .ace_variable                             { color: ${varColor || "#9cdcfe"} !important; }
    .ace_support.ace_class,
    .ace_entity.ace_name.ace_type             { color: ${typeColor || "#4ec9b0"} !important; }
    .ace_storage.ace_type                     { color: ${keyword  || "#569cd6"} !important; }
    .ace_constant.ace_language                { color: ${number   || "#569cd6"} !important; }
  `;
}