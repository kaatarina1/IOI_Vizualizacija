// speremenljivka, ki bo hranila naš canvas
let canvas;

// spremenljivke, ki bodo hranile besedilo na strani
let textType, textZoom, textSpecila;
let typeCount = 0; // koliko znakov je uporabnik napisla
let zoomActive = 0;
let specialPosts = 0;

// Parametri za LCC (Lambert Conformal Conic) projekcijo (spodnje vrednosti so specifične za Slovenijo)
let phi1 = 45.5; //radians(46); - Standardni vzporednik 1 (približno 46°N)
let phi2 = 46.5; //radians(47); - Standardni vzporednik 2 (približno 47°N)
let lambda0 = 14.5; //radians(14.5); - Centralni poldnevnik (približno 14.5°E)
let phi0 = 46; //radians(46); - Referenčna zemljepisna širina (približno 46°N) - približno na sredini Slovenije

// n določa, kako hitro se razdalje spreminjajo glede na širino in kako se dolžine deformirajo na različnih širinah.
// F se uporablja se izračunu projekcijske razdalje (ρ) na stožčnem zemljevidu. Pomaga določiti velikost deformacije na različnih širinah.
// rho0 je oddaljenost centralne širine od projekcijskega središča.
let n, F, rho0;

// v to spremenljivko shranimo tabelo iz poste.csv datoteke
let poste;
let posebnePoste;
let table;

// spremenljivke določajo minimalne in maksimalne zemljepisne višine in širine (po izvajanju LCC projekcije)
let maxX = -1; // maksimalna latituda po projeciranju
let minX = 1; // minimalna latituda po projeciranju
let maxY = -1; // maksimalna longituda po projeciranju
let minY = 1; // minimalna longituda po projeciranju

let originalMaxX = -1; // maksimalna latituda pred projeciranjem
let originalMinX = 1; // minimalna latituda pred projeciranjem
let originalMaxY = -1; // maksimalna longituda pred projeciranjem
let originalMinY = 1; // minimalna longituda pred projeciranjem
// Meje v katarih naj se zemljevid prikazuje
let mapX1, mapY1, mapX2, mapY3;

// določimo barve za različne scenarije
const backgroundColor = "#212120";
const pointsColor = "#FFD541";
const highlightedColor = "#f7e8b2";
const unhighlightedColor = "#4a4737";
const badSearchColor = "#e6b502";
const popupColor = "#fcf7e3";

let popup;

let clearLayer = false;

let switchState = false; // Initial state of the switch (off)
let switchX, switchY; // Position of the switch
let switchWidth = 45; // Width of the switch
let switchHeight = 20; // Height of the switch
let togglePos; // Current position of the toggle
let targetPos; // Target position for the toggle

function preload() {
	// preberemo podatke o poštah iz datoteke poste.csv [objectId, latitude, longitude, postalCode, place]
	poste = loadTable(
		"data/regular_post_offices_with_latlong.csv",
		"csv",
		"header"
	);
	posebnePoste = loadTable("data/posebne_poste.csv", "csv", "header");
	table = poste;
}

function setup() {
	canvas = createCanvas(920, 653);

	layer1 = createGraphics(920, 653);
	layer2 = createGraphics(920, 653);
	layer3 = createGraphics(920, 653);

	centerCanvas();
	createText();

	mapX1 = 60;
	mapX2 = width - mapX1;
	mapY1 = 50;
	mapY2 = height - mapY1;

	// parametre za LCC pretvorimo v radiane
	phi1 = radians(phi1);
	phi2 = radians(phi2);
	lambda0 = radians(lambda0);
	phi0 = radians(phi0);

	// izračunamo konstante n, F in rho0
	n =
		(log(cos(phi1)) - log(cos(phi2))) /
		(log(tan(PI / 4 + phi2 / 2)) - log(tan(PI / 4 + phi1 / 2)));
	F = (cos(phi1) * pow(tan(PI / 4 + phi1 / 2), n)) / n;
	rho0 = F / pow(tan(PI / 4 + phi0 / 2), n);

	// predprocesiranje podatkov
	preprocessing();

	// izrišemo piko za vsako pošto v Sloveniji
	background(backgroundColor);
	colorPosts(-1);

	createPopUp();
	// Set the position of the switch
	switchX = canvas.x - 60;
	switchY = canvas.y + 33;
	console.log(switchX, switchY);
	// Set initial toggle position (left for "off")
	togglePos = switchX + switchHeight / 2;
	targetPos = togglePos; // Initially, target is the same as current position
}

function createPopUp() {
	//Naredimo popup ko je samo ena posta
	popup = createDiv("");
	popup.style("background-color", "transparent");
	popup.style("font-family", "monospace");
	popup.style("font-size", "15px");
	popup.style("color", popupColor);
	popup.style("width", "fit-content");
	popup.hide(); // Na začetku je skrit
}

function colorPosts(match) {
	for (let i = 0; i < table.getRowCount(); i++) {
		let x = table.getNum(i, "latitude");
		let y = table.getNum(i, "longitude");
		let newColor = table.getString(i, "newColor");
		if (match !== -1 && match === i) {
			drawChoosen(x, y, newColor, i);
		} else {
			drawPost(x, y, newColor, i);
		}
	}
}

let chosenX, chosenY;

function drawChoosen(x, y, newColor, index) {
	let postalCode = table.getString(index, "postalCode");
	let place = table.getString(index, "place");
	chosenX = x;
	chosenY = y;
	let xx = mapX(x);
	let yy = mapY(y);
	layer2.stroke(newColor);
	layer2.strokeWeight(4);
	table.setString(index, "currColor", newColor);
	layer2.rect(xx - 2.5, yy - 2.5, 3, 3);
	popup.html(place + ", " + postalCode);
	popup.show();
	let relativeX = xx + canvas.x - popup.html().length * 5;
	let relativeY = yy + canvas.y - 30;
	popup.position(relativeX, relativeY);
}

function centerCanvas() {
	let centerX = (windowWidth - width) / 2;
	let centerY = (windowHeight - height) / 2;
	canvas.position(centerX, centerY);
}

function createText() {
	textZoom = createP("zoom");
	textType = createP("Type the digits of a zip code");
	textSpecila = createP("Show special posts");

	textZoom.style("font-family", "monospace");
	textType.style("font-family", "monospace");
	textSpecila.style("font-family", "monospace");

	textZoom.style("font-size", "25px");
	textType.style("font-size", "20px");
	textSpecila.style("font-size", "20px");

	textZoom.style("color", unhighlightedColor);
	textType.style("color", unhighlightedColor);
	textSpecila.style("color", unhighlightedColor);

	positionText();
}

function positionText() {
	textType.position(canvas.x + 30, canvas.y);

	textSpecila.position(canvas.x + 30, canvas.y + 30);
	textZoom.position(canvas.x + width - 80, canvas.y + height - 70);

	textZoom.mousePressed(handleClick);
	textZoom.style("cursor", "pointer");
}

function projectionLCC(lat, lon) {
	let rho = F / pow(tan(PI / 4 + lat / 2), n);
	let theta = n * (lon - lambda0);

	let x = rho * sin(theta);
	let y = rho0 - rho * cos(theta);

	return [x, y];
}

function preprocessing() {
	// dodamo stolpec, ki bo predstavljal barvo te vrstice v danem trenutku
	table.addColumn("newColor");
	table.addColumn("currColor");
	// projeciramo zemljepisno širino in višino za vsak zapis v tabeli
	for (let row = 0; row < table.getRowCount(); row++) {
		// preberemo zemljepisno višino in širino za določeno pošto
		let lat = table.getNum(row, "latitude");
		let lon = table.getNum(row, "longitude");
		if (lat > 46.876 || lon > 16.888 || lat < 45.422 || lon < 13.375) {
			let name = table.getString(row, "place");
			let postalCode = table.getString(row, "postalCode");
			console.log(name, postalCode, lat, lon);
		}
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
		table.getRow(row).setString("currColor", pointsColor);
		table.getRow(row).setString("newColor", pointsColor);
	}
	originalMaxX = maxX;
	originalMaxY = maxY;
	originalMinX = minX;
	originalMinY = minY;
}

function drawPost(x, y, newColor, index) {
	let xx = mapX(x);
	let yy = mapY(y);
	let currColor = table.getString(index, "currColor");
	let blendColor = lerpColor(color(currColor), color(newColor), 0.1);
	layer1.stroke(blendColor);
	layer1.strokeWeight(2);
	layer1.point(xx, yy);
	table.setString(index, "currColor", blendColor);
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

	xx = mapX(chosenX);
	yy = mapY(chosenY);

	let relativeX = xx + canvas.x - popup.html().length * 5;
	let relativeY = yy + canvas.y - 30;
	popup.position(relativeX, relativeY);
}

function keyPressed() {
	if (key >= "0" && key <= "9") {
		if (typeCount > 0 && typeCount < 4) {
			let currentText = textType.html();
			let newText = currentText + key;
			typeCount++;
			textType.html(newText);
			findPost(newText);
		} else if (typeCount === 0) {
			textType.html(key);
			typeCount++;
			textType.style("color", highlightedColor);
			findPost(key);
		}
		if (zoomActive === 1) {
			targetScale = scaleFactor + 0.1 * typeCount;
		}
	} else if (key === "Backspace" || key === "Delete") {
		if (typeCount > 0) {
			popup.hide();
			typeCount--;
			let currentText = textType.html();
			let newText = currentText.substring(0, currentText.length - 1);
			textType.html(newText);
			if (typeCount === 0) {
				textType.html("Type the digits of a zip code");
				textType.style("color", unhighlightedColor);
				if (zoomActive === 1) {
					targetScale = 1;
					maxX = originalMaxX;
					minX = originalMinX;
					maxY = originalMaxY;
					minY = originalMinY;
				}
			} else {
				if (typeCount === 3) {
					clearLayer = true;
				}
				findPost(newText);
				if (zoomActive === 1) {
					targetScale = scaleFactor - 0.1 * typeCount;
				}
			}
		}
	} else if (key === "z" || key === "Z") {
		if (zoomActive === 0) {
			zoomActive = 1;
			textZoom.style("color", highlightedColor);
		} else if (zoomActive === 1) {
			zoomActive = 0;
			textZoom.style("color", unhighlightedColor);
			targetScale = 1;
			maxX = originalMaxX;
			minX = originalMinX;
			maxY = originalMaxY;
			minY = originalMinY;

			mapX1 = 60;
			mapX2 = width - mapX1;
			mapY1 = 50;
			mapY2 = height - mapY1;

			clear();
			layer1.clear();
			scale(scaleFactor);
		}
	}
}

function handleClick() {
	if (zoomActive === 0) {
		zoomActive = 1;
		textZoom.style("color", highlightedColor);
	} else if (zoomActive === 1) {
		zoomActive = 0;
		textZoom.style("color", unhighlightedColor);
	}
}

function findPost(searchValue) {
	// Gremo čez vse vrstice
	let anyMatches = 0;
	let match = -1;
	let newMinX = 1;
	let newMaxX = -1;
	let newMinY = 1;
	let newMaxY = -1;
	for (let r = 0; r < table.getRowCount(); r++) {
		let postalCode = table.getString(r, "postalCode"); // Pridobimo vrednost poštne številke za trenutno vrstico
		let lat = table.getNum(r, "latitude");
		let lon = table.getNum(r, "longitude");
		// Preverimo ali se začne s searchValue
		if (postalCode.startsWith(searchValue)) {
			anyMatches = 1;
			table.setString(r, "newColor", highlightedColor);
			if (searchValue.length === 4) {
				match = r;
			}
			if (zoomActive === 1) {
				if (lat > newMaxX) newMaxX = lat;
				if (lat < newMinX) newMinX = lat;
				if (lon > newMaxY) newMaxY = lon;
				if (lon < newMinY) newMinY = lon;
			}
		} else {
			table.setString(r, "newColor", unhighlightedColor);
		}
	}
	if (anyMatches === 0) {
		textType.style("color", badSearchColor);
	} else {
		textType.style("color", highlightedColor);
	}
	colorPosts(match);
	if (zoomActive === 1) {
		// izračunamo sredino med mejnimi vrednostmi
		maxX = newMaxX;
		minX = newMinX;
		maxY = newMaxY;
		minY = newMinY;

		mapX1 = 60;
		mapX2 = width - mapX1;
		mapY1 = 50;
		mapY2 = height - mapY1;
	}
}

function resetColor() {
	for (let r = 0; r < table.getRowCount(); r++) {
		table.setString(r, "newColor", pointsColor);
	}
	colorPosts();
}

function drawSwitch() {
	// Draw the background of the switch (base)
	if (switchState) {
		fill(unhighlightedColor); // Green for ON
		textSpecila.style("color", highlightedColor);
	} else {
		fill(backgroundColor); // Red for OFF
		textSpecila.style("color", unhighlightedColor);
	}
	stroke(unhighlightedColor);
	rect(switchX, switchY, switchWidth, switchHeight, 20); // Rounded rectangle

	// Draw the circle inside the switch (toggle)
	fill(highlightedColor);
	ellipse(togglePos, switchY + switchHeight / 2, switchHeight - 4); // Smoothly moving toggle
}

function mousePressed() {
	// Check if the mouse click is inside the switch area
	if (
		mouseX > switchX &&
		mouseX < switchX + switchWidth &&
		mouseY > switchY &&
		mouseY < switchY + switchHeight
	) {
		switchState = !switchState; // Toggle the switch state// Set the new target position for smooth transition
		if (switchState) {
			targetPos = switchX + switchWidth - switchHeight / 2; // Right position for ON
			// set color of all posts to unhighlighted
			// table = posebnePoste;
			// preprocessing();
		} else {
			targetPos = switchX + switchHeight / 2; // Left position for OFF
			// set color of all posts to unhighlighted
			// table = poste;
			// preprocessing();
		}
	}
}

let scaleFactor = 1;
let targetScale = 1;
function draw() {
	background(backgroundColor); // Draw the switch button

	if (zoomActive === 1) {
		textZoom.style("color", highlightedColor);

		scaleFactor = lerp(scaleFactor, targetScale, 0.1);

		clear();
		layer1.clear();
		scale(scaleFactor);
	}

	if (typeCount === 0) {
		resetColor();
	} else {
		colorPosts(-1);
	}
	image(layer1, 0, 0);

	if (clearLayer) {
		clear();
		colorPosts(-1);
		layer2.clear();
		clearLayer = false;
	}

	if (typeCount === 4) {
		image(layer2, 0, 0);
	}
	// izrišemo piko za vsako pošto v Sloveniji
	drawSwitch();
	// Smoothly interpolate the toggle position
	togglePos = lerp(togglePos, targetPos, 0.1); // The 0.1 controls how fast the toggle moves
}
