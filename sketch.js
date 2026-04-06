let unitSize = 20;
let sliderX, sliderY, sliderZ;
let cullSlider, seedSlider;
let rotateSlider, zoomSlider;
let isoToggle, orthoToggle;
let edgeToggle;
let sizeXSlider, sizeYSlider, sizeZSlider;
let visibleBoxIndices = [];
let outputDiv;
let exportBtn;

function setup() {
  createCanvas(600, 600, WEBGL);
  noStroke();

  // --- sliders ---
  sliderX      = createSlider(1, 75, 5, 1);         sliderX.position(20, 20);
  sliderY      = createSlider(1, 75, 10, 1);        sliderY.position(20, 50);
  sliderZ      = createSlider(1, 75, 5, 1);         sliderZ.position(20, 80);
  cullSlider   = createSlider(0, 100, 0, 1);        cullSlider.position(20, 110);
  seedSlider   = createSlider(0, 999, 0, 1);        seedSlider.position(20, 140);  // ← NEW
  rotateSlider = createSlider(0, 360, 45, 1);       rotateSlider.position(20, 170);
  zoomSlider   = createSlider(100, 1500, 400, 1);   zoomSlider.position(20, 200);

  // --- box size sliders ---
  sizeXSlider = createSlider(5, 100, 20, 1); sizeXSlider.position(20, 230);
  sizeYSlider = createSlider(5, 100, 20, 1); sizeYSlider.position(20, 260);
  sizeZSlider = createSlider(5, 100, 20, 1); sizeZSlider.position(20, 290);

  // --- toggles ---
  isoToggle   = createCheckbox("Isometric View",       true);  isoToggle.position(20, 330);
  orthoToggle = createCheckbox("Parallel Projection",  true);  orthoToggle.position(20, 360);
  edgeToggle  = createCheckbox("Show Edges",           true);  edgeToggle.position(20, 390);

  // --- export button ---
  exportBtn = createButton('Export 3D');
  exportBtn.position(20, 520);
  exportBtn.style('padding', '6px 14px');
  exportBtn.style('font-size', '14px');
  exportBtn.style('cursor', 'pointer');
  exportBtn.mousePressed(exportOBJ);

  // --- output div ---
  outputDiv = createDiv('');
  outputDiv.position(20, 430);
  outputDiv.style('color', 'white');
  outputDiv.style('font-family', 'monospace');
  outputDiv.style('font-size', '16px');

  // --- callbacks ---
  // grid + cull + seed all regenerate boxes
  [sliderX, sliderY, sliderZ, cullSlider, seedSlider].forEach(sl => sl.input(updateScene));
  // size sliders only affect visual scale
  [sizeXSlider, sizeYSlider, sizeZSlider].forEach(sl => sl.input(redraw));
  // toggles just redraw
  [isoToggle, orthoToggle, edgeToggle].forEach(chk => chk.changed(redraw));

  generateVisibleBoxes();
}

// ─────────────────────────────────────────────
// Generate box grid indices
// Seed controls WHICH boxes are culled.
// Cull % controls HOW MANY are culled.
// ─────────────────────────────────────────────
function generateVisibleBoxes() {
  let countX      = sliderX.value();
  let countY      = sliderY.value();
  let countZ      = sliderZ.value();
  let cullPercent = cullSlider.value() / 100;
  let seed        = seedSlider.value();

  // 1. Build full list of every possible box
  let allBoxes = [];
  for (let x = 0; x < countX; x++)
    for (let y = 0; y < countY; y++)
      for (let z = 0; z < countZ; z++)
        allBoxes.push([x, y, z]);

  // 2. Shuffle using seed — same seed = same order always
  randomSeed(seed);
  for (let i = allBoxes.length - 1; i > 0; i--) {
    let j = floor(random() * (i + 1));
    let tmp = allBoxes[i];
    allBoxes[i] = allBoxes[j];
    allBoxes[j] = tmp;
  }

  // 3. Keep exact count — cull removes a fixed number, not a probability
  let keepCount = floor(allBoxes.length * (1 - cullPercent));
  visibleBoxIndices = allBoxes.slice(0, keepCount);
}

// ─────────────────────────────────────────────
// Draw
// ─────────────────────────────────────────────
function draw() {
  background(0);

  let zoom = zoomSlider.value();

  // Projection
  if (orthoToggle.checked()) {
    let scaleFactor = zoom / 800;
    ortho(
      -width  / 2 * scaleFactor,
       width  / 2 * scaleFactor,
      -height / 2 * scaleFactor,
       height / 2 * scaleFactor,
      0, 5000
    );
  } else {
    perspective();
  }

  // Camera
  let angle  = radians(rotateSlider.value());
  let camDist = orthoToggle.checked() ? 800 : zoom;
  let camX   = cos(angle) * camDist;
  let camZ   = sin(angle) * camDist;
  let camY   = isoToggle.checked() ? -camDist * 0.7 : -camDist * 0.3;
  camera(camX, camY, camZ, 0, 0, 0, 0, 1, 0);

  // Current box sizes and grid counts
  let boxW   = sizeXSlider.value();
  let boxH   = sizeYSlider.value();
  let boxD   = sizeZSlider.value();
  let countX = sliderX.value();
  let countY = sliderY.value();
  let countZ = sliderZ.value();

  // Draw boxes
  for (let idx of visibleBoxIndices) {
    let ix = idx[0], iy = idx[1], iz = idx[2];

    let posX = (ix - countX / 2) * boxW;
    let posY = (iy - countY / 2) * boxH;
    let posZ = (iz - countZ / 2) * boxD;

    push();
    translate(posX, posY, posZ);
    let inter = map(iy, 0, countY - 1, 0, 1);
    fill(
      lerp(43,  252, inter),
      lerp(174, 246, inter),
      lerp(102, 245, inter)
    );
    edgeToggle.checked() ? stroke(255) : noStroke();
    box(boxW, boxH, boxD);
    pop();
  }

  updateOutputs();
}

// ─────────────────────────────────────────────
// HUD output
// ─────────────────────────────────────────────
function updateOutputs() {
  outputDiv.html(`
    Boxes: ${visibleBoxIndices.length}<br>
    Box W: ${sizeXSlider.value()}<br>
    Box H: ${sizeYSlider.value()}<br>
    Box D: ${sizeZSlider.value()}<br>
    Seed:  ${seedSlider.value()}
  `);
}

// ─────────────────────────────────────────────
// Regenerate scene
// ─────────────────────────────────────────────
function updateScene() {
  generateVisibleBoxes();
}

// ─────────────────────────────────────────────
// OBJ Export
// ─────────────────────────────────────────────
function exportOBJ() {
  let boxW   = sizeXSlider.value();
  let boxH   = sizeYSlider.value();
  let boxD   = sizeZSlider.value();
  let countX = sliderX.value();
  let countY = sliderY.value();
  let countZ = sliderZ.value();

  let lines = [
    '# Exported from p5.js box grid',
    `# Boxes: ${visibleBoxIndices.length}`,
    `# Box size: ${boxW} x ${boxH} x ${boxD}`,
    `# Seed: ${seedSlider.value()}`,
    ''
  ];

  let vertOffset = 1;
  let hx = boxW / 2, hy = boxH / 2, hz = boxD / 2;

  let corners = [
    [-hx,-hy,-hz],[ hx,-hy,-hz],[ hx, hy,-hz],[-hx, hy,-hz],
    [-hx,-hy, hz],[ hx,-hy, hz],[ hx, hy, hz],[-hx, hy, hz],
  ];

  let faces = [
    [0,1,2,3],[5,4,7,6],[4,0,3,7],
    [1,5,6,2],[4,5,1,0],[3,2,6,7],
  ];

  for (let idx of visibleBoxIndices) {
    let posX = (idx[0] - countX / 2) * boxW;
    let posY = (idx[1] - countY / 2) * boxH;
    let posZ = (idx[2] - countZ / 2) * boxD;

    for (let c of corners) {
      lines.push(`v ${(posX+c[0]).toFixed(3)} ${(-posY-c[1]).toFixed(3)} ${(posZ+c[2]).toFixed(3)}`);
    }
    for (let f of faces) {
      let i = vertOffset;
      lines.push(`f ${i+f[0]} ${i+f[1]} ${i+f[2]} ${i+f[3]}`);
    }
    vertOffset += 8;
    lines.push('');
  }

  let a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], {type:'text/plain'}));
  a.download = 'boxes.obj';
  a.click();
  URL.revokeObjectURL(a.href);
}