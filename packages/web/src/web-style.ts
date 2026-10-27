/** Shared Web styling is bundled with the component so Pages/embedded hosts use identical bytes. */
export const operatorStyles = `
:root{color-scheme:dark;--df-bg:#0b0e14;--df-panel:#141923;--df-edge:#2a3341;--df-text:#e8edf4;--df-muted:#aab6c8;--df-accent:#74bdf9;--df-focus:#f6c965;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}
html{scroll-behavior:auto}
body{margin:0;background:var(--df-bg);color:var(--df-text);font-size:14px;line-height:1.55}
button,textarea,input{font:inherit}
button{padding:.5rem .82rem;border:1px solid #4a5d78;background:#242f42;border-radius:.5rem;color:var(--df-text);cursor:pointer}
button:hover:not(:disabled){background:#30435b}
button:disabled{opacity:.55;cursor:not-allowed}
a{color:var(--df-accent);text-underline-offset:3px}
a:hover{text-decoration:underline}
:focus-visible{outline:3px solid var(--df-focus);outline-offset:3px}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.df-skip{position:fixed;z-index:20;top:-4rem;left:1rem;background:var(--df-panel);padding:1rem;border-radius:.4rem}
.df-skip:focus{top:1rem}
.darkfactory-shell{display:grid;grid-template-columns:252px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);min-height:100vh}
.df-side{grid-column:1;grid-row:1 / span 2;background:#10151e;border-right:1px solid var(--df-edge);padding:1.2rem 1rem;min-height:100vh}
.df-side-brand{display:flex;align-items:center;gap:.85rem;padding:.4rem .6rem 1.6rem;font-weight:750;font-size:1.12rem;letter-spacing:-.02em}
.df-side-brand small{display:block;color:var(--df-muted);font-size:.76rem;letter-spacing:0;font-weight:450}
.df-brand-icon{display:grid;place-items:center;background:#1b4268;color:#a8d9ff;border:1px solid #376795;border-radius:.7rem;width:2.8rem;height:2.8rem;font-size:.9rem}
.df-nav-group{margin:.6rem 0 1.2rem}
.df-nav-group-label{margin:.2rem .65rem .5rem;text-transform:uppercase;letter-spacing:.12em;font-size:.68rem;color:var(--df-muted);font-weight:700}
.route-link{display:block;color:#d6e0ed;text-decoration:none;padding:.45rem .7rem;margin:.14rem 0;border-radius:.4rem;font-weight:510}
.route-link:hover,.route-link.is-active{background:#253649;color:#f6fbff;text-decoration:none}
.route-link.is-active{box-shadow:inset 3px 0 var(--df-accent)}
.df-top{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:space-between;min-height:4.45rem;gap:1rem;border-bottom:1px solid var(--df-edge);padding:0 2rem;background:#10151e}
.df-breadcrumb{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#c5d3e2;overflow-wrap:anywhere}
.df-auth{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;justify-content:flex-end}
.df-auth-status{color:var(--df-muted)}
.df-main{grid-column:2;grid-row:2;min-width:0;padding:2rem clamp(1rem,4vw,4.2rem) 5rem;max-width:1320px;width:100%;margin:0 auto}
.df-section{max-width:100%;min-height:17rem}
.df-heading h2{font-size:clamp(1.45rem,3vw,2rem);line-height:1.2;letter-spacing:-.04em;margin:0 0 .7rem}
.df-heading p{color:var(--df-muted);max-width:75ch;margin:0 0 1.4rem}
.df-toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin:1rem 0 .9rem;flex-wrap:wrap}
.df-meta{display:flex;gap:.9rem;flex-wrap:wrap;color:var(--df-muted);font-size:.8rem}
.df-meta time{white-space:nowrap}
.df-notice,.df-caveat,.df-empty{border:1px solid var(--df-edge);border-radius:.75rem;padding:1.2rem 1.4rem;background:var(--df-panel);margin:1rem 0}
.df-caveat{border-left:4px solid #7893b2;color:#c6d4e7;background:#182435}
.df-problem{border-left:4px solid #e0a37c}
.df-list{padding:0;margin:0;list-style:none;display:grid;gap:.45rem}
.df-row{display:flex;justify-content:space-between;align-items:flex-start;gap:1.4rem;padding:1rem 1.2rem;border:1px solid var(--df-edge);border-radius:.65rem;background:var(--df-panel)}
.df-row-content{min-width:0}
.df-row-content strong{display:block;font-size:.94rem;line-height:1.35;margin-bottom:.35rem}
.df-row-actions{display:flex;align-items:center;flex-wrap:wrap;gap:.5rem;justify-content:flex-end}
.df-badge,.df-stack,.df-tag{display:inline-block;padding:.16rem .55rem;border:1px solid #445771;border-radius:999px;background:#202e41;font-size:.75rem;color:#d7e6fa;white-space:nowrap}
.df-tags{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.6rem}
.df-tag{border-color:#323e50;background:#1e2532;color:#b9c5d5}
.df-stack{border-color:#73684a;background:#392f1e}
.df-data-note{font-size:.82rem;color:var(--df-muted)}
.df-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:1rem}
.df-summary p{grid-column:1 / -1;color:var(--df-muted);margin:.2rem 0}
.df-stat{background:var(--df-panel);border:1px solid var(--df-edge);padding:1.2rem;border-radius:.8rem;display:flex;flex-direction:column;gap:.5rem;min-height:112px}
.df-stat span{color:var(--df-muted);font-size:.8rem}
.df-stat strong{overflow-wrap:anywhere;font-size:1.08rem}
.df-config,.df-markdown{white-space:pre-wrap;overflow:auto;overflow-wrap:anywhere;background:#090d13;border:1px solid var(--df-edge);border-radius:.8rem;padding:1.25rem;font-size:.81rem;color:#d6e5f7;line-height:1.5}
.df-editor{border:1px solid #456688;background:#182435;border-radius:.8rem;padding:1.3rem;margin-top:1.1rem}
.df-editor h3{margin-top:0}
.df-editor label{display:block;margin:.8rem 0 .3rem}
.df-editor textarea{display:block;width:100%;background:#0b1522;color:var(--df-text);border:1px solid #59728e;border-radius:.4rem;padding:.7rem}
.df-actions{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.8rem}
.df-references{font-size:.8rem;color:var(--df-muted)}
.quota-grid,.quota-providers{display:grid;gap:.8rem}
.quota-model,.quota-provider{border:1px solid var(--df-edge);border-radius:.7rem;padding:1rem;background:var(--df-panel)}
.quota-model dl{display:grid;grid-template-columns:auto 1fr;column-gap:1rem}
.quota-model dt{color:var(--df-muted)}
@media(max-width:950px){
.darkfactory-shell{grid-template-columns:1fr;grid-template-rows:auto auto 1fr}
.df-side{grid-column:1;grid-row:2;min-height:0;border-right:0;border-bottom:1px solid var(--df-edge);padding:.5rem .9rem}
.df-side-brand{padding:.3rem .25rem .6rem}
.df-side nav{display:flex;overflow:auto;gap:1.2rem;scrollbar-width:thin;padding-bottom:.3rem}
.df-nav-group{flex:none;margin:0}
.df-nav-group-label{margin:0 .5rem .2rem}
.df-nav-group .route-link{display:inline-block;white-space:nowrap}
.df-top{grid-column:1;grid-row:1;padding:.7rem 1.1rem;min-height:3.8rem}
.df-main{grid-column:1;grid-row:3;padding:1.4rem 1rem 4rem}
}
@media(max-width:580px){
.df-top{align-items:flex-start;flex-direction:column;gap:.6rem}
.df-row{flex-direction:column}
.df-row-actions{align-self:flex-start}
.df-meta{gap:.4rem .9rem}
.df-heading h2{font-size:1.45rem}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
