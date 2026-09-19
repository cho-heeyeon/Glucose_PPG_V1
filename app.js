const video=document.getElementById('video');
const sample=document.getElementById('sample'), sctx=sample.getContext('2d',{willReadFrequently:true});
const chart=document.getElementById('chart'), statusEl=document.getElementById('status'), timer=document.getElementById('timer');
const cameraBtn=document.getElementById('cameraBtn'), measureBtn=document.getElementById('measureBtn'), saveBtn=document.getElementById('saveBtn');
const glucose=document.getElementById('glucose');
let stream=null, rows=[], measuring=false;

cameraBtn.onclick=async()=>{
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    video.srcObject=stream; await video.play();
    const track=stream.getVideoTracks()[0];
    const caps=track.getCapabilities ? track.getCapabilities() : {};
    if(caps.torch){ try{await track.applyConstraints({advanced:[{torch:true}]});}catch(e){} }
    measureBtn.disabled=false;
    statusEl.textContent='② 검지 끝으로 후면 카메라와 플래시 부위를 덮은 뒤 측정하세요.';
  }catch(e){ statusEl.textContent='카메라 권한/HTTPS 환경을 확인하세요: '+e.message; }
};

measureBtn.onclick=async()=>{
  if(measuring)return; measuring=true; rows=[]; saveBtn.disabled=true; measureBtn.disabled=true;
  const start=performance.now(), duration=30000;
  statusEl.textContent='측정 중입니다. 손가락을 움직이지 마세요.';
  function loop(now){
    const elapsed=now-start, remain=Math.max(0,duration-elapsed);
    timer.textContent=(remain/1000).toFixed(1)+'초';
    const rgb=framePPG(sctx,video);
    rows.push({t_ms:Math.round(elapsed),...rgb});
    drawSignal(chart,rows);
    if(elapsed<duration) requestAnimationFrame(loop);
    else{
      measuring=false; measureBtn.disabled=false; saveBtn.disabled=false;
      timer.textContent='완료'; statusEl.textContent='③ 같은 시점의 실제 혈당계/CGM 값을 입력하고 CSV로 저장하세요.';
    }
  }
  requestAnimationFrame(loop);
};

saveBtn.onclick=()=>{
  const value=Number(glucose.value);
  if(!value){ alert('실제 혈당계/CGM 값을 입력하세요.'); return; }
  const id=new Date().toISOString();
  const header='sample_id,t_ms,red_mean,green_mean,blue_mean,reference_glucose_mg_dl\n';
  const body=rows.map(x=>[id,x.t_ms,x.r.toFixed(3),x.g.toFixed(3),x.b.toFixed(3),value].join(',')).join('\n');
  const blob=new Blob([header+body],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='ppg_'+id.replace(/[:.]/g,'-')+'.csv'; a.click(); URL.revokeObjectURL(a.href);
};
