// speremenljivka, ki bo hranila naš canvas
let canvas;

// spremenljivke, ki bodo hranile besedilo na strani
let textType, textZoom;
let typeCount = 0; // koliko znakov je uporabnik napisla
let zoomActive = 0;

// Parametri za LCC (Lambert Conformal Conic) projekcijo (spodnje vrednosti so specifične za Slovenijo)
let phi1 = 46; //radians(46); - Standardni vzporednik 1 (približno 46°N)
let phi2 = 47; //radians(47); - Standardni vzporednik 2 (približno 47°N)
let lambda0 = 14.5 //radians(14.5); - Centralni poldnevnik (približno 14.5°E)
let phi0 = 46; //radians(46); - Referenčna zemljepisna širina (približno 46°N) - približno na sredini Slovenije

// n določa, kako hitro se razdalje spreminjajo glede na širino in kako se dolžine deformirajo na različnih širinah.
// F se uporablja se izračunu projekcijske razdalje (ρ) na stožčnem zemljevidu. Pomaga določiti velikost deformacije na različnih širinah.
// rho0 je oddaljenost centralne širine od projekcijskega središča.
let n, F, rho0;

// v to spremenljivko shranimo tabelo iz poste.csv datoteke
let table;

// spremenljivke določajo minimalne in maksimalne zemljepisne višine in širine (po izvajanju LCC projekcije)
let maxX = -1; // maksimalna latituda po projeciranju
let minX = 1;  // minimalna latituda po projeciranju
let maxY = -1; // maksimalna longituda po projeciranju
let minY = 1;  // minimalna longituda po projeciranju

// Meje v katarih naj se zemljevid prikazuje
let mapX1, mapY1, mapX2, mapY3;

// določimo barve za različne scenarije
const backgroundColor = '#212120';
const pointsColor = '#FFD541';
const highlightedColor = '#f7e8b2';
const unhighlightedColor = '#4a4737';
const badSearchColor = '#e6b502';
const popupColor = '#fcf7e3';

let popup;

function preload() {
  // preberemo podatke o poštah iz datoteke poste.csv [objectId, latitude, longitude, postalCode, place]
  table = loadTable("data/poste.csv", "csv", "header");
}
  
function setup() {
  canvas = createCanvas(920, 653);
  
  centerCanvas();
  createText();
  
  mapX1 = 60;
  mapX2 = width - mapX1;
  mapY1 = 50;
  mapY2 = height - mapY1;
  
  background(200);
  
  // parametre za LCC pretvorimo v radiane 
  phi1 = radians(phi1);
  phi2 = radians(phi2);
  lambda0 = radians(lambda0);
  phi0 = radians(phi0);
  
  // izračunamo konstante n, F in rho0
  n = (log(cos(phi1)) - log(cos(phi2))) / (log(tan(PI / 4 + phi2 / 2)) - log(tan(PI / 4 + phi1 / 2)));
  F = (cos(phi1) * pow(tan(PI / 4 + phi1 / 2), n)) / n;
  rho0 = F / pow(tan(PI / 4 + phi0 / 2), n);
  
  // predprocesiranje podatkov
  preprocessing();
  
  // izrišemo piko za vsako pošto v Sloveniji
  background(backgroundColor);
  colorPosts(-1);
  
  //Naredimo popup ko je samo ena posta
  popup = createDiv("");
  popup.style('background-color', popupColor);
  popup.style('padding', '10px');
  popup.style('border-radius', '5px');
  popup.style('position', 'absolute');
  popup.style('font-family', 'monospace');
  popup.style('font-size', '14px');
  popup.hide();  // Na začetku je skrit
}

function colorPosts(match) {
  for (let i = 0; i < table.getRowCount(); i++) {
    let x = table.getNum(i, "latitude");
    let y = table.getNum(i, "longitude");
    let newColor = table.getString(i, 'color');

    let xx = mapX(x);
    let yy = mapY(y);
    stroke(newColor);
    strokeWeight(4);
    point(xx, yy);
    if (match !== -1 && match === i) {
      let postalCode = table.getString(i, 'postalCode');
      let place = table.getString(i, 'place');
      popup.html(place + ", " + postalCode);
      popup.position(xx, yy - popup.size().height - 10);
      popup.show();
    }
  }
}

function centerCanvas() {
  let centerX = (windowWidth - width) / 2;
  let centerY = (windowHeight - height) / 2;
  canvas.position(centerX, centerY);
}

function createText() {
  textZoom = createP("zoom");
  textType = createP("Type the digits of a zip code");

  textZoom.style('font-family', 'monospace');
  textType.style('font-family', 'monospace');
  
  textZoom.style('font-size', '25px');
  textType.style('font-size', '20px');
  
  textZoom.style('color', unhighlightedColor);
  textType.style('color', unhighlightedColor);
  
  positionText();
}

function positionText() {
  textType.position(canvas.x + 30, canvas.y);
  textZoom.position(canvas.x + width - 80, canvas.y + height - 70);
  
  textZoom.mousePressed(handleClick);
  textZoom.style('cursor', 'pointer');
}
  

function projectionLCC(lat, lon) {
    let rho = F / pow(tan(PI / 4 + lat / 2), n);
    let theta = n * (lon - lambda0);

    let x = rho * sin(theta);
    let y = rho0 - rho * cos(theta);
    
    return[x, y];
}

function preprocessing() {
  // dodamo stolpec, ki bo predstavljal barvo te vrstice v danem trenutku
  table.addColumn('color');
  // projeciramo zemljepisno širino in višino za vsak zapis v tabeli 
  for (let row = 0; row < table.getRowCount(); row++) {
    // preberemo zemljepisno višino in širino za določeno pošto
    let lat = table.getNum(row, "latitude");
    let lon = table.getNum(row, "longitude");
    // projeciramo koordinate
    let xy = projectionLCC(radians(lat), radians(lon));
    // shranimo projecirane koordinate 
    table.setNum(row, "latitude", xy[0]);
    table.setNum(row, "longitude", xy[1]);
    // preverimo ali imamo novo max ali min x ali y koordinato
    if (xy[0] > maxX) maxX = xy[0];
    if (xy[0] < minX) minX = xy[0];
    if (xy[1] > maxY) maxY = xy[1];
    if (xy[1] < minY) minY = xy[1];
    // najprej vsaki vrstici barvo nastavimo na osnovno
    table.getRow(row).setString('color', pointsColor);
  }
}

function drawPost(x, y, newColor) {
  let xx = mapX(x);
  let yy = mapY(y);
  stroke(newColor);
  strokeWeight(6);
  point(xx, yy);
}

function mapX(x) {
  return map(x, minX, maxX, mapX1, mapX2);
}

function mapY(y) {
  return map(y, minY, maxY, mapY2, mapY1);
}

function windowResized() {
  centerCanvas();
  positionText();
}

function keyPressed() {
  if (key >= '0' && key <= '9') {
    if (typeCount > 0 && typeCount < 4) {
      let currentText = textType.html();
      let newText = currentText + key;
      typeCount++;
      textType.html(newText);
      findPost(newText);
    } else if (typeCount === 0) {
      textType.html(key);
      typeCount++;
      textType.style('color', highlightedColor);
      findPost(key);
    }
  } else if (key === 'Backspace' || key === 'Delete') {
    if (typeCount > 0) {
      popup.hide();
      typeCount--;
      let currentText = textType.html();
      let newText = currentText.substring(0, currentText.length - 1);
      textType.html(newText);
      if (typeCount === 0) {
        textType.html("Type the digits of a zip code");
        textType.style('color', unhighlightedColor);
        resetColor();
      } else {
        findPost(newText);
      }
    }
  } else if (key === 'z' || key === 'Z') {
    if (zoomActive === 0) {
      zoomActive = 1;
      textZoom.style('color', highlightedColor);
    } else if (zoomActive === 1) {
      zoomActive = 0;
      textZoom.style('color', unhighlightedColor);
    }
  }
}

function handleClick() {
  if (zoomActive === 0) {
      zoomActive = 1;
      textZoom.style('color', highlightedColor);
    } else if (zoomActive === 1) {
      zoomActive = 0;
      textZoom.style('color', unhighlightedColor);
    }
}

function findPost(searchValue) {
  // Gremo čez vse vrstice
  let anyMatches = 0;
  let match = -1;
  for (let r = 0; r < table.getRowCount(); r++) {
    let postalCode = table.getString(r, 'postalCode');  // Pridobimo vrednost poštne številke za trenutno vrstico

    // Preverimo ali se začne s searchValue
    if (postalCode.startsWith(searchValue)) {
      anyMatches = 1;
      table.setString(r, 'color', highlightedColor);
      if (searchValue.length === 4) {
        match = r;
      }
    } else {
      table.setString(r, 'color', unhighlightedColor);
    }
  }
  if (anyMatches === 0) {
    textType.style('color', badSearchColor);
  } else {
    textType.style('color', highlightedColor);
  }
  colorPosts(match);
}

function resetColor() {
  for (let r = 0; r < table.getRowCount(); r++) {
      table.setString(r, 'color', pointsColor);
  }
  colorPosts();
}



function draw() {
}

  
