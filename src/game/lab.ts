export type LabResult = { ok: boolean; lines: string[] };
// This is a local execution helper, not a security boundary or automated grader.
export const workerSource = `self.onmessage = async ({data}) => {
 const lines=[];let total=0;let truncated=false;let assertionFailed=false;
 const show=value=>{try{return (typeof value==='string'?value:JSON.stringify(value)??String(value)).slice(0,2000);}catch{return '[unprintable value]';}};
 const add=(...args)=>{if(lines.length>=100||total>=50000){truncated=true;return;}const line=args.slice(0,20).map(show).join(' ').slice(0,Math.min(2000,50000-total));lines.push(line);total+=line.length;};
 console.log=add;console.error=(...args)=>add('ERROR:',...args);console.assert=(condition,...args)=>{if(!condition){assertionFailed=true;add('ASSERTION FAILED:',...args);}};
 let ok=true;try{const result=await (0,eval)(data);if(result!==undefined)add('RETURN:',result);}catch(error){ok=false;add(error?.name||'Error',error?.message||String(error));}
 if(truncated)lines.push('[Output truncated after 100 lines or 50,000 characters.]');
 self.postMessage({ok:ok&&!assertionFailed,lines});
};`;
export function startLab(
  code: string,
  receive: (result: LabResult) => void,
): () => void {
  let worker: Worker | undefined;
  let url: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;
  const cleanup = () => {
    if (timer) clearTimeout(timer);
    worker?.terminate();
    if (url) URL.revokeObjectURL(url);
  };
  const finish = (result: LabResult) => {
    if (done) return;
    done = true;
    cleanup();
    receive(result);
  };
  try {
    if (code.length > 100000)
      throw new Error("Lab code exceeds 100,000 characters.");
    url = URL.createObjectURL(
      new Blob([workerSource], { type: "text/javascript" }),
    );
    worker = new Worker(url);
    timer = setTimeout(
      () =>
        finish({
          ok: false,
          lines: [
            "Timeout: the lab stopped after 2.5 seconds. Check for an infinite loop.",
          ],
        }),
      2500,
    );
    worker.onerror = (event) => {
      event.preventDefault();
      finish({
        ok: false,
        lines: ["Worker error: " + event.message.slice(0, 2000)],
      });
    };
    worker.onmessage = (event) => {
      const data = event.data;
      if (
        !data ||
        typeof data.ok !== "boolean" ||
        !Array.isArray(data.lines) ||
        data.lines.length > 101 ||
        data.lines.some(
          (line: unknown) => typeof line !== "string" || line.length > 2000,
        )
      ) {
        finish({ ok: false, lines: ["The lab returned an invalid result."] });
        return;
      }
      finish(data as LabResult);
    };
    worker.postMessage(code);
  } catch (error) {
    finish({ ok: false, lines: [(error as Error).message] });
  }
  return () => {
    if (done) return;
    done = true;
    cleanup();
  };
}
