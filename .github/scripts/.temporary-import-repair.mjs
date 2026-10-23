return async function repair(tools,start,size) {
 const R="marius-patrik/DarkFactory",A="https://api.github.com/repos/"+R,B="fix/ci-fail-closed-empty-quality-matrix";
 const pr=(await tools.mcp__GitHub__get_pr_info({repository_full_name:R,pr_number:2509})).result,head=pr.head_sha;
 const c=JSON.parse((await tools.mcp__GitHub__fetch({url:A+"/git/commits/"+head})).result.content);
 const tr=JSON.parse((await tools.mcp__GitHub__fetch({url:A+"/git/trees/"+c.tree.sha+"?recursive=1"})).result.content).tree;
 const files=tr.filter(x=>x.type==="blob").map(x=>x.path),set=new Set(files),dirs=new Set();
 for(const f of files){let x=f.split("/");for(let i=1;i<x.length;i++)dirs.add(x.slice(0,i).join("/"));}
 const oldSrc=(await tools.mcp__GitHub__fetch_file({repository_full_name:R,path:".github/scripts/.one-shot-rewrite-paths.mjs",ref:head})).result.content;
 const m=oldSrc.match(/const paths=(\[[\s\S]*?\]),fileSet=/);if(!m)throw Error("original path map unavailable");
 const oldFiles=JSON.parse(m[1]),oldSet=new Set(oldFiles);
 const move=p=>p.startsWith("packages/harness/src/github/")?(p.endsWith("/types.ts")?"packages/github/src/types.ts":"packages/github/src/"+p.split("/").at(-1)):p.startsWith("packages/harness/src/approvals/")?"packages/github/src/approvals/"+p.split("/").at(-1):p.startsWith("packages/harness/src/ci/")&&p.endsWith(".ts")&&!p.endsWith(".test.ts")&&!p.endsWith("/detected.ts")?"packages/github/src/ci/"+p.split("/").at(-1):p.startsWith("packages/")&&p.split("/")[2]==="test"?".github/tests/"+p.split("/")[1]+"/"+p.split("/").slice(3).join("/"):p.startsWith("tests/")?".github/tests/"+p.slice(6):p.startsWith(".darkfactory/")&&p.includes(".test.")?".github/tests/"+p.slice(1):p.startsWith("packages/")&&p.includes(".test.")?".github/tests/"+p.split("/")[1]+"/"+p.split("/").slice(2).join("/"):p.startsWith("scripts/")&&p.includes(".test.")?".github/tests/"+p:p;
 const origin=new Map();for(const f of oldFiles){const dest=move(f);if(set.has(dest)&&(!origin.has(dest)||dest===f))origin.set(dest,f);}
 const norm=s=>{let a=[];for(const x of s.split("/")){if(x==="..")a.pop();else if(x&&x!==".")a.push(x);}return a.join("/")};
 const dir=p=>p.split("/").slice(0,-1).join("/");
 const rel=(from,to)=>{let a=dir(from).split("/"),b=to.split("/");while(a.length&&b.length&&a[0]===b[0]){a.shift();b.shift();}const s=[...a.map(()=>".."),...b].join("/");return s.startsWith(".")?s:"./"+s;};
 const exists=p=>set.has(p)||set.has(p+".ts")||set.has(p+".tsx")||set.has(p+"/index.ts")||set.has(p+"/index.tsx")||dirs.has(p);
 const resolveOld=p=>[p,p+".ts",p+".tsx",p+".js",p+".mjs",p+"/index.ts",p+"/index.tsx"].find(x=>oldSet.has(x));
 const TS=files.filter(x=>/\.[cm]?[jt]sx?$/.test(x)).sort((a,b)=>a.localeCompare(b));
 const selected=TS.slice(start,start+size),data=await Promise.all(selected.map(async path=>({path,s:(await tools.mcp__GitHub__fetch_file({repository_full_name:R,path,ref:head})).result.content})));
 const changes=[],unresolved=[],examples=[];let fixes=0;
 for(const {path,s} of data){
  const previous=origin.get(path)??path;
  const next=s.replace(/(["'])(\.{1,2}\/[^"'\n]+)\1/g,(whole,q,raw)=>{
   const target=norm(dir(path)+"/"+raw);if(exists(target))return whole;
   const historical=norm(dir(previous)+"/"+raw),old=resolveOld(historical);
   if(!old){if(unresolved.length<12)unresolved.push({path,raw,historical});return whole;}
   const moved=move(old);if(!exists(moved)){if(unresolved.length<12)unresolved.push({path,raw,old,moved});return whole;}
   let correct=rel(path,moved);
   if(old!==historical&&correct.endsWith(old.slice(historical.length)))correct=correct.slice(0,-(old.length-historical.length));
   if(correct===raw)return whole;
   fixes++;if(examples.length<8)examples.push([path,raw,correct]);return q+correct+q;
  });
  if(next!==s)changes.push({path,mode:"100644",type:"blob",content:next});
 }
 let nextHead=head;
 if(changes.length){
  const tree=(await tools.mcp__GitHub__create_tree({repository_full_name:R,base_tree_sha:c.tree.sha,tree_elements:changes})).result.sha;
  nextHead=(await tools.mcp__GitHub__create_commit({repository_full_name:R,parent_sha:head,tree_sha:tree,message:"fix(paths): repair relocated imports "+(start+1)+"-"+(start+selected.length)})).result.sha;
  const update=await tools.mcp__GitHub__update_ref({repository_full_name:R,branch_name:B,sha:nextHead,expected_sha:head,force:false});
  if(!update.result.success)throw Error("branch moved concurrently; check latest head");
 }
 return {start,total:TS.length,scanned:selected.length,filesUpdated:changes.length,references:fixes,unresolved,examples,head:nextHead};
};