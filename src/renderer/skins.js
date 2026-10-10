import { SkinViewer } from 'skinview3d';

let viewer = null;

function initViewer(canvas) {
  viewer = new SkinViewer({
    canvas: canvas,
    width: 300,
    height: 400,
    skin: null
  });
  viewer.autoRotate = true;
  viewer.animation = new WalkingAnimation();
  return viewer;
}

function loadSkinFromFile(file) {
  const url = URL.createObjectURL(file);
  viewer.loadSkin(url);
}
