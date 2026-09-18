const frequencyInputs = [...document.querySelectorAll('input[name="frequency"]')];
const volumeInput = document.querySelector('#volume');
const volumeReadout = document.querySelector('#volume-readout');
const activeReadout = document.querySelector('#active-readout');
const playButton = document.querySelector('#play');
const stopButton = document.querySelector('#stop');
const statusText = document.querySelector('#status-text');
const statusLight = document.querySelector('#status-light');
const canvas = document.querySelector('#scope-canvas');
const canvasContext = canvas.getContext('2d');

let audioContext;
let masterGain;
let activeOscillators = [];
let isPlaying = false;
let animationFrame;

function selectedFrequencies() {
  return frequencyInputs.filter((input) => input.checked).map((input) => Number(input.value));
}

function updateReadouts() {
  const frequencies = selectedFrequencies();
  volumeReadout.textContent = `${volumeInput.value}%`;
  activeReadout.textContent = frequencies.length
    ? `${frequencies.join(' + ')} Hz selected`
    : 'No frequency selected';
  playButton.disabled = frequencies.length === 0 || isPlaying;
}

function targetMasterGain() {
  const oscillatorCount = Math.max(activeOscillators.length, selectedFrequencies().length, 1);
  return (Number(volumeInput.value) / 100) * (0.28 / oscillatorCount);
}

function updateActiveGain() {
  if (!masterGain || !audioContext) return;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(targetMasterGain(), audioContext.currentTime, 0.02);
}

async function playSelectedTones() {
  const frequencies = selectedFrequencies();
  if (!frequencies.length || isPlaying) return;

  audioContext ??= new AudioContext();
  await audioContext.resume();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0, audioContext.currentTime);
  masterGain.connect(audioContext.destination);

  activeOscillators = frequencies.map((frequency) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.connect(masterGain);
    oscillator.start();
    return oscillator;
  });
  masterGain.gain.linearRampToValueAtTime(targetMasterGain(), audioContext.currentTime + 0.05);

  isPlaying = true;
  statusLight.classList.add('active');
  statusText.textContent = `Playing ${frequencies.join(' + ')} Hz. Audio travels through the speaker and microphone.`;
  playButton.disabled = true;
  stopButton.disabled = false;
  drawScope();
}

function stopTones() {
  if (!isPlaying || !audioContext || !masterGain) return;
  const stopTime = audioContext.currentTime + 0.05;
  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, stopTime);
  activeOscillators.forEach((oscillator) => oscillator.stop(stopTime + 0.01));
  activeOscillators = [];
  isPlaying = false;
  statusLight.classList.remove('active');
  statusText.textContent = 'Stopped. Change the frequency selection or run the next controlled test.';
  stopButton.disabled = true;
  updateReadouts();
}

function resizeCanvasForDisplay() {
  const pixelRatio = window.devicePixelRatio || 1;
  const displayWidth = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const displayHeight = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

function drawScope() {
  resizeCanvasForDisplay();
  const width = canvas.width;
  const height = canvas.height;
  const frequencies = selectedFrequencies();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeOffset = isPlaying && !reducedMotion ? performance.now() / 1000 : 0;

  canvasContext.clearRect(0, 0, width, height);
  canvasContext.strokeStyle = '#272b24';
  canvasContext.lineWidth = 1;
  for (let column = 0; column <= 12; column += 1) {
    const x = (column / 12) * width;
    canvasContext.beginPath();
    canvasContext.moveTo(x, 0);
    canvasContext.lineTo(x, height);
    canvasContext.stroke();
  }
  for (let row = 0; row <= 6; row += 1) {
    const y = (row / 6) * height;
    canvasContext.beginPath();
    canvasContext.moveTo(0, y);
    canvasContext.lineTo(width, y);
    canvasContext.stroke();
  }

  canvasContext.strokeStyle = '#d8ff52';
  canvasContext.lineWidth = Math.max(2, window.devicePixelRatio || 1);
  canvasContext.beginPath();
  for (let x = 0; x < width; x += 2) {
    const normalizedTime = x / width / 180;
    const amplitude = frequencies.length
      ? frequencies.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * (normalizedTime + timeOffset)), 0) / frequencies.length
      : 0;
    const y = height / 2 - amplitude * height * 0.34;
    if (x === 0) canvasContext.moveTo(x, y);
    else canvasContext.lineTo(x, y);
  }
  canvasContext.stroke();

  if (isPlaying && !reducedMotion) animationFrame = requestAnimationFrame(drawScope);
}

frequencyInputs.forEach((input) => input.addEventListener('change', () => {
  if (isPlaying) stopTones();
  updateReadouts();
  cancelAnimationFrame(animationFrame);
  drawScope();
}));
volumeInput.addEventListener('input', () => {
  updateReadouts();
  updateActiveGain();
});
playButton.addEventListener('click', playSelectedTones);
stopButton.addEventListener('click', stopTones);
window.addEventListener('resize', drawScope);
window.addEventListener('pagehide', stopTones);

updateReadouts();
drawScope();
