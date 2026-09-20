const video = document.getElementById('video');

const sample = document.getElementById('sample');
const sctx = sample.getContext('2d', { willReadFrequently: true });

const chart = document.getElementById('chart');
const statusEl = document.getElementById('status');
const timer = document.getElementById('timer');

const cameraBtn = document.getElementById('cameraBtn');
const measureBtn = document.getElementById('measureBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

const glucose = document.getElementById('glucose');

let stream = null;
let rows = [];
let measuring = false;


// --------------------------------------------------
// 1. 카메라 시작
// --------------------------------------------------
cameraBtn.onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: 'environment'
        }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    const track = stream.getVideoTracks()[0];

    const caps = track.getCapabilities
      ? track.getCapabilities()
      : {};

    if (caps.torch) {
      try {
        await track.applyConstraints({
          advanced: [
            {
              torch: true
            }
          ]
        });
      } catch (e) {
        console.log('플래시 자동 켜기 실패:', e);
      }
    }

    measureBtn.disabled = false;

    statusEl.textContent =
      '검지 끝으로 후면 카메라와 플래시 부위를 덮은 뒤 측정하세요.';

  } catch (e) {
    statusEl.textContent =
      '카메라 권한/HTTPS 환경을 확인하세요: ' + e.message;
  }
};


// --------------------------------------------------
// 2. 30초 PPG 측정
// --------------------------------------------------
measureBtn.onclick = async () => {

  if (measuring) return;

  measuring = true;

  // 이전 측정 데이터 초기화
  rows = [];

  saveBtn.disabled = true;
  measureBtn.disabled = true;

  // 이전 그래프 삭제
  const chartCtx = chart.getContext('2d');
  chartCtx.clearRect(
    0,
    0,
    chart.width,
    chart.height
  );

  const start = performance.now();
  const duration = 30000;

  statusEl.textContent =
    '측정 중입니다. 손가락을 움직이지 마세요.';

  function loop(now) {

    const elapsed = now - start;

    if (elapsed < duration) {

      timer.textContent =
        (Math.max(0, duration - elapsed) / 1000).toFixed(1)
        + '초';

      const rgb = framePPG(
        sctx,
        video
      );

      rows.push({
        // 첫 데이터가 음수가 되지 않도록 0 이상으로 저장
        t_ms: Math.max(
          0,
          Math.round(elapsed)
        ),

        ...rgb
      });

      drawSignal(
        chart,
        rows
      );

      requestAnimationFrame(loop);

    } else {

      measuring = false;

      measureBtn.disabled = false;
      saveBtn.disabled = false;

      timer.textContent = '완료';

      statusEl.textContent =
        '측정 완료. 혈당 기준값은 선택사항입니다. PPG 데이터를 CSV로 저장하세요.';
    }
  }

  requestAnimationFrame(loop);
};


// --------------------------------------------------
// 3. CSV 저장
// --------------------------------------------------
// --------------------------------------------------
// 3. CSV 저장
// --------------------------------------------------
saveBtn.onclick = () => {

  if (rows.length === 0) {
    alert('먼저 30초 PPG 측정을 진행하세요.');
    return;
  }

  // 혈당계/CGM 값은 선택사항
  const value =
    glucose.value.trim() === ''
      ? ''
      : Number(glucose.value);

  const id = new Date().toISOString();

  const header =
    'sample_id,t_ms,red_mean,green_mean,blue_mean,reference_glucose_mg_dl\n';

  const body = rows.map(x => [
    id,
    x.t_ms,
    x.r.toFixed(3),
    x.g.toFixed(3),
    x.b.toFixed(3),
    value
  ].join(',')).join('\n');

  // Excel에서 한글이 깨지는 것을 방지하기 위해 BOM 추가
  const csvContent =
    '\uFEFF' + header + body;

  const blob = new Blob(
    [csvContent],
    { type: 'text/csv;charset=utf-8;' }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;

  a.download =
    'ppg_'
    + id.replace(/[:.]/g, '-')
    + '.csv';

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  // 모바일에서 다운로드가 시작될 시간을 줌
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  statusEl.textContent =
    'CSV 저장을 요청했습니다. 휴대폰 다운로드 폴더를 확인하세요.';
};


// --------------------------------------------------
// 4. 데이터 초기화
// --------------------------------------------------
resetBtn.onclick = () => {

  // 측정 중에는 초기화하지 않음
  if (measuring) {

    alert('측정이 끝난 후 초기화해 주세요.');
    return;
  }

  // 현재 측정 데이터 삭제
  rows = [];

  // CSV 저장 비활성화
  saveBtn.disabled = true;

  // 타이머 초기화
  timer.textContent = '30.0초';

  // 안내문 초기화
  statusEl.textContent =
    '측정 준비가 완료되었습니다.';

  // 혈당 기준값도 초기화
  glucose.value = '';

  // 그래프 삭제
  const chartCtx =
    chart.getContext('2d');

  chartCtx.clearRect(
    0,
    0,
    chart.width,
    chart.height
  );
};
