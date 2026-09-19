function framePPG(ctx, video) {
  ctx.drawImage(video, 0, 0, 64, 64);
  const d = ctx.getImageData(0,0,64,64).data;
  let r=0,g=0,b=0,n=d.length/4;
  for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; }
  return {r:r/n,g:g/n,b:b/n};
}
function drawSignal(canvas, rows){
  const c=canvas.getContext('2d'), w=canvas.width,h=canvas.height;
  c.clearRect(0,0,w,h); if(rows.length<2)return;
  const vals=rows.map(x=>x.g), min=Math.min(...vals), max=Math.max(...vals), span=(max-min)||1;
  c.beginPath();
  rows.forEach((x,i)=>{
    const px=i*(w/(rows.length-1)), py=h-(x.g-min)/span*h;
    i?c.lineTo(px,py):c.moveTo(px,py);
  }); c.stroke();
}
