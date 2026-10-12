// Tone-maps a picture to ASCII for the splash dragons (see dragon-art.js).
// Usage: PLAYWRIGHT_MODULE=... [WHITE=1] [CROP=x,y,w,h] node tools/ascii-art.mjs picture.png cols " .:o8@" gamma > out.txt
//   WHITE=1 keys out a white page (ink drawings); otherwise a transparent/checkerboard background is keyed by saturation.
//   A negative gamma maps dark ink to the dense glyphs instead of bright highlights.
const pw=await import(process.env.PLAYWRIGHT_MODULE);const chromium=pw.chromium||pw.default.chromium;
const {readFileSync}=await import('node:fs');
const [img,colsArg,rampArg,gammaArg]=process.argv.slice(2);const crop=(process.env.CROP||'').split(',').map(Number);const white=!!process.env.WHITE;const cols=+colsArg||100,ramp=rampArg||' .:o8@',gamma=+gammaArg||1;
const b64=readFileSync(img).toString('base64');
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await br.newPage();
const out=await p.evaluate(async({b64,cols,ramp,gamma,crop,white})=>{const im=new Image();im.src='data:image;base64,'+b64;await im.decode();
  const [cx,cy,cw,ch]=crop.length===4?crop:[0,0,im.width,im.height];const cellW=cw/cols,rows=Math.round(ch/(cellW*2.0));
  const c=document.createElement('canvas');c.width=cols;c.height=rows;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(im,cx,cy,cw,ch,0,0,cols,rows);
  const d=g.getImageData(0,0,cols,rows).data;let out='';
  const vals=[];for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],bb=d[i+2],a=d[i+3]/255,mx=Math.max(r,gg,bb),mn=Math.min(r,gg,bb),sat=mx?(mx-mn)/mx:0,lum=(r*.3+gg*.59+bb*.11)/255;if(white?lum<.86:(a>.5&&(sat>.28||lum<.45)))vals.push(white?1-lum:mx/255);}
  vals.sort((a,b)=>a-b);const lo=vals[Math.floor(vals.length*.04)]||0,hi=vals[Math.floor(vals.length*.97)]||1;
  for(let y=0;y<rows;y++){let line='';for(let x=0;x<cols;x++){const i=(y*cols+x)*4,r=d[i],gg=d[i+1],bb=d[i+2],a=d[i+3]/255;
    const mx=Math.max(r,gg,bb),mn=Math.min(r,gg,bb),sat=mx?(mx-mn)/mx:0,lum=(r*.3+gg*.59+bb*.11)/255;
    const fg=white?lum<.86:(a>.5&&(sat>.28||lum<.45));
    let v=0;if(fg){v=Math.pow(Math.min(1,Math.max(0,((white?1-lum:mx/255)-lo)/(hi-lo))),Math.abs(gamma));if(gamma<0)v=1-v;}
    line+=fg?ramp[Math.max(1,Math.min(ramp.length-1,Math.floor(v*ramp.length)))]:' ';}
    out+=line.replace(/\s+$/,'')+'\n';}
  return out;},{b64,cols,ramp,gamma,crop,white});
process.stdout.write(out.replace(/^(\s*\n)+/,'').replace(/\n+$/,'\n'));await br.close();
