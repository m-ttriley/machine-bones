/* eslint-disable import/no-unresolved */
import * as THREE from 'three';
import * as dat from 'dat.gui';
import point from './textures/sprites/cogs.png';
import songFile from './assets/MB.mp3';

require('./style.css');

let isMobile = window.innerWidth < 600;

const vertexShader = `
uniform float rotationX;

attribute float size;
varying vec3 vColor;
varying mat4 vPosition;

float random (vec2 st) {
  return fract(sin(dot(st.xy,
                       vec2(12.9898,78.233)))*
      43758.5453123);
}

void main() {
  mat4 rXPos = mat4(vec4(1.0,0.0,0.0,0.0), vec4(0.0,cos(rotationX),-sin(rotationX),0.0), vec4(0.0,sin(rotationX),cos(rotationX),0.0), vec4(0.0,0.0,0.0,1.0));
  vColor = color;
  vPosition = rXPos;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

  gl_PointSize = size * ( 175.0 / -mvPosition.z );

  gl_Position = projectionMatrix * mvPosition;

}
`;

const fragmentShader = `
uniform sampler2D pointTexture;

varying vec3 vColor;

void main() {

  gl_FragColor = vec4( vColor, 1.0 );

  gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );

}
`;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

const fftSize = 2048;
const frequencyRange = {
  bass: [20, 140],
  lowMid: [140, 400],
  mid: [400, 2600],
  highMid: [2600, 5200],
  treble: [5200, 14000],
};

let renderer; let scene; let camera; let
  video;
let videoWidth; let videoHeight; let
  imageCache;
let audioListener; let audio; let audioLoader; let
  analyser;

let particleSystem; let uniforms; let
  geometry;

let particles = 0;

initVideo();
initAudio();
animate();

/**
 * https://github.com/processing/p5.js-sound/blob/v0.14/lib/p5.sound.js#L1765
 *
 * @param data
 * @param _frequencyRange
 * @returns {number} 0.0 ~ 1.0
 */
function getFrequencyRangeValue(data, _frequencyRange) {
  const nyquist = 48000 / 2;
  const lowIndex = Math.round(_frequencyRange[0] / nyquist * data.length);
  const highIndex = Math.round(_frequencyRange[1] / nyquist * data.length);
  let total = 0;
  let numFrequencies = 0;

  for (let i = lowIndex; i <= highIndex; i++) {
    total += data[i];
    numFrequencies += 1;
  }
  return total / numFrequencies / 255;
}

function getImageData(image, useCache) {
  if (useCache & imageCache) {
    return imageCache;
  }

  const w = image.videoWidth;
  const h = image.videoHeight;

  canvas.width = w;
  canvas.height = h;

  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(image, 0, 0);
  imageCache = ctx.getImageData(0, 0, w, h);

  return imageCache;
}

function initVideo() {
  video = document.getElementById('video');
  if (!video) {
    video = document.createElement('video');
    document.body.append(video);
    video.id = 'video';
    video.autoplay = true;
    video.playsInline = true;
  }

  const option = {
    video: true,
    audio: false,
  };

  navigator.mediaDevices.getUserMedia(option)
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener('loadeddata', () => {
        videoWidth = video.videoWidth;
        videoHeight = video.videoHeight;
        const container = document.createElement('div');
        container.className = 'container';
        document.body.append(container);

        init();
      });
    })
    .catch((error) => {
      console.log(error);
      showAlert();
    });
}

function initAudio() {
  audioListener = new THREE.AudioListener();
  audio = new THREE.Audio(audioListener);
  audioLoader = new THREE.AudioLoader();

  audioLoader.load(songFile, (buffer) => {
    audio.setBuffer(buffer);
    audio.setLoop(true);
    audio.play();
  });

  analyser = new THREE.AudioAnalyser(audio, fftSize);
}

function init() {
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.z = 156;

  // let gui = new dat.GUI();
  // gui.add(camera.position, "z", 0, 500);
  scene = new THREE.Scene();

  uniforms = {
    pointTexture: { value: new THREE.TextureLoader().load(point) },
    rotationX: { type: 'f', value: 0.2 },
  };

  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: false,
    vertexColors: true,
  });

  const radius = 200;

  geometry = new THREE.BufferGeometry();

  const positions = [];
  const colors = [];
  const sizes = [];

  const color = new THREE.Color();
  const imageData = getImageData(video);

  for (let y = 0, { height } = imageData; y < height; y += 1) {
    for (let x = 0, { width } = imageData; x < width; x += 1) {
      // const pixel = (x + y) * 3;
      positions.push(x - imageData.width / 2);
      positions.push(-y + imageData.height / 4);
      positions.push(0);

      color.setHSL(0.5, 1.0, 0.75);

      colors.push(color.r, color.g, color.b);
      // colors.push(imageData.data[pixel], imageData.data[pixel + 1], imageData.data[pixel + 2])

      // sizes.push((Math.random() * 25) + 2);
      sizes.push(20);
      particles++;
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));

  particleSystem = new THREE.Points(geometry, shaderMaterial);

  scene.add(particleSystem);

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  // renderer.setSize((0.75 * window.innerWidth), (0.75 * window.innerHeight));
  renderer.setSize((window.innerWidth), (window.innerHeight));

  document.body.appendChild(renderer.domElement);
  document.querySelector('canvas').addEventListener('click', () => {
    if (audio) {
      if (audio.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  });

  //

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  isMobile = window.innerWidth < 600;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  // renderer.setSize((0.75 * window.innerWidth), (0.75 * window.innerHeight));
  renderer.setSize((window.innerWidth), (window.innerHeight));
}

function animate() {
  requestAnimationFrame(animate);

  render();
}

function render() {
  const time = Date.now() * 0.005;
  const density = 2;
  const useCache = parseInt(time, 10) % 2 === 0; // To reduce CPU usage.
  const imageData = getImageData(video, useCache);
  let r; let g; let
    b;
  if (analyser) {
    // analyser.getFrequencyData() would be an array with a size of half of fftSize.
    const data = analyser.getFrequencyData();

    const bass = getFrequencyRangeValue(data, frequencyRange.bass);
    const mid = getFrequencyRangeValue(data, frequencyRange.mid);
    const treble = getFrequencyRangeValue(data, frequencyRange.highMid);

    r = bass;
    g = mid;
    b = treble;
  }

  if (particleSystem) {
    // particleSystem.rotation.z = 0.005 * time;
    // particleSystem.material.uniforms.rotationX.value += 0.001;
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.color.array;
    const pointColor = new THREE.Color();
    for (let i = 2; i < positions.length; i += 3) {
      if (i % density !== 0) {
        positions[i] = 10000;
        continue;
      }
      const index = i * 4;
      const gray = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
      const threshold = 500;
      if (gray < threshold) {
        if (gray < threshold / 3) {
          positions[i] = gray * 0.05 * 5 + (r * 3);
        } else if (gray < threshold / 2) {
          positions[i] = gray * 0.05 * 5 + (g * 3);
        } else {
          positions[i] = gray * 0.05 * 5 + (b * 3);
        }
      } else {
        positions[i] = 10000;
      }
    }

    for (let j = 0; j < colors.length; j += 3) {
      pointColor.setHSL(r, g * 2, b + 0.25);
      colors[j] = pointColor.r;
      colors[j + 1] = pointColor.g;
      colors[j + 2] = pointColor.b;

      // colors.push(pointColor.r, pointColor.g, pointColor.b);
      // colors[j] = Math.random() * (b * 2);
      // colors[j + 1] = Math.random() * (b * 2);
      // colors[j + 2] = Math.random() * (g * 2);
      
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    renderer.render(scene, camera);
  }
}
